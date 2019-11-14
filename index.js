'use strict';

const Hapi = require('@hapi/hapi');
const Wreck = require('@hapi/wreck');
const Path = require('path');
const parser = require('xml2json-light');
const Entities = require('html-entities').AllHtmlEntities;
const { Pool } = require('pg');

const entities = new Entities();
const connection = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'project',
    password: 'password',
    port: 5432,
});

const openapikey = '721407f393e84a28593374cc2b347a98';
const options = { headers: { 'openapikey': openapikey } };
const hostApi = 'https://api.elevenia.co.id';

const migrateDb = async() => {
    try {
        await connection.query(`CREATE TABLE IF NOT EXISTS product (
            id serial PRIMARY KEY, 
            nama VARCHAR(100) NOT NULL,
            qty INTEGER,
            images TEXT,
            description TEXT,
            price decimal(11,2)
        )`);
        console.log('Table created!');
    } catch (error) {
        console.log(error);
    }
}

const clearProducts = async() => {
    try {
        await connection.query(`DELETE FROM product`);
        console.log('All product cleared');
    } catch (error) {
        console.log(error);
    }
}

const saveProduct = (product) => {
    try {
        connection.query(`INSERT INTO product 
            (id, nama, qty, images, description, price)
            VALUES
            ($1, $2, $3, $4, $5, $6)
        `, [product.no, product.name, product.stock, JSON.stringify(product.images), product.desc, product.price]);
        console.log('Product saved: ' + product.name);
    } catch (error) {
        console.log(error);
    }
}

const getProducts = async() => {
    try {
        const result = await connection.query(`SELECT * FROM product ORDER BY ID`);
        console.log('Get Products');
        return result.rows.map(item => {
            item.images = JSON.parse(item.images);
            item.price = item.price.toString();
            item.price = item.price.replace(/\.00/, '');
            item.description = entities.decode(item.description);
            return item;
        });
    } catch (error) {
        console.log(error);
    }
}

const getProduct = async(id) => {
    try {
        const result = await connection.query(`SELECT * FROM product WHERE id = $1`, [id]);
        console.log('Get Product');
        return result.rows;
    } catch (error) {
        console.log(error);
    }
}

const updateProduct = async(id, data) => {
    try {
        const result = await connection.query(`UPDATE product SET nama=$2, qty=$3, description=$4, price=$5, images=$6 WHERE id=$1`, [
            id,
            data.nama,
            data.qty,
            entities.decode(data.description),
            data.price,
            data.images
        ]);
        console.log('Update Product');
        return result.rows;
    } catch (error) {
        console.log(error);
    }
}

const deleteProduct = async(id) => {
    try {
        const result = await connection.query(`DELETE FROM product WHERE id = $1`, [id]);
        console.log('Delete Product');
        return result.rows;
    } catch (error) {
        console.log(error);
    }
}

const getList = async(page) => {
    try {
        const { res, payload } = await Wreck.get(hostApi + '/rest/prodservices/product/listing?page=' + page, options);
        const result = parser.xml2json(payload.toString());
        if (typeof result.Products === 'undefined') {
            throw new Error('Error tidak berhasil mengambil data!');
        }
        if (result.Products === '') {
            console.log('Tidak ada data di elevenia.co.id!');
            return;
        }
        const products = result.Products.product;
        console.log('Collecting data from elevenia.co.id...');
        for (let index = 0; index < products.length; index++) {
            const product = products[index];
            const { res, payload } = await Wreck.get(hostApi + '/rest/prodservices/product/details/' + product.prdNo, options);
            const productDetail = parser.xml2json(payload.toString());
            let formatted = {
                no: productDetail.Product.prdNo,
                name: productDetail.Product.prdNm,
                stock: productDetail.Product.stock,
                images: getImages(productDetail.Product),
                desc: productDetail.Product.htmlDetail,
                price: productDetail.Product.selPrc
            };
            // Save in database
            saveProduct(formatted);
        }
        console.log(":::::::::::::::::: Complete ::::::::::::::::::");
    } catch (error) {
        console.log(error);
    }
}

const getImages = (product) => {
    let listImages = [];
    for (let index = 1; index < 20; index++) {
        const image = product['prdImage' + ("0" + index).slice(-2)];
        if (typeof image === 'undefined') {
            break;
        }
        listImages.push(image);
    }
    return listImages;
}

const init = async() => {
    await migrateDb();
    const checkProducts = await getProducts();
    if (checkProducts.length === 0) {
        await getList(1);
    }

    const server = Hapi.server({
        port: 3000,
        host: 'localhost',
        routes: {
            files: {
                relativeTo: Path.join(__dirname, 'public')
            }
        }
    });

    await server.register(require('inert'));

    server.route({
        method: 'GET',
        path: '/',
        handler: (request, h) => {
            return h.file('index.html');
        }
    });

    server.route({
        method: 'GET',
        path: '/dist/main.js',
        handler: (request, h) => {
            return h.file('dist/main.js');
        }
    });

    server.route({
        method: 'GET',
        path: '/list-products',
        handler: async(request, h) => {
            const products = await getProducts();
            return products;
        }
    });

    server.route({
        method: 'GET',
        path: '/product/{id}',
        handler: async(request, h) => {
            const product = await getProduct(request.params.id);
            return product;
        }
    });

    server.route({
        method: 'POST',
        path: '/product/{id}',
        handler: async(request, h) => {
            const payload = request.payload;
            const data = {
                nama: payload.nama,
                qty: parseInt(payload.qty),
                images: payload.images,
                description: payload.description,
                price: parseFloat(payload.price)
            }
            for (let index = 0; index < data.length; index++) {
                const element = data[index];
                if (typeof element === 'undefined') {
                    return { status: false, message: 'Input tidak valid', data: data };
                }
            }
            const product = await updateProduct(request.params.id, data);
            return [data];
        }
    });

    server.route({
        method: 'GET',
        path: '/delete-product/{id}',
        handler: async(request, h) => {
            const product = await deleteProduct(request.params.id);
            return {
                status: true,
                message: `Product id: ${request.params.id} berhasil dihapus!`
            };
        }
    });

    server.route({
        method: 'GET',
        path: '/collecting-products/{page}',
        handler: async(request, h) => {
            await getList(request.params.page);
            return {
                status: true,
                message: 'Products Collected!'
            };
        }
    });

    server.route({
        method: 'GET',
        path: '/clear-products',
        handler: async(request, h) => {
            await clearProducts();
            return {
                status: true,
                message: 'Products Cleared!'
            };
        }
    });

    await server.start();
    console.log('Server running on %s', server.info.uri);
};

process.on('unhandledRejection', (err) => {
    console.log(err);
    process.exit(1);
});

init();