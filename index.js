'use strict';

const Hapi = require('@hapi/hapi');
const Wreck = require('@hapi/wreck');
const parser = require('xml2json-light');
const { Pool } = require('pg');
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
    await connection.query(`CREATE TABLE IF NOT EXISTS product (
        id serial PRIMARY KEY, 
        nama VARCHAR(100) NOT NULL,
        qty INTEGER,
        images TEXT,
        description TEXT,
        price decimal(11,2)
    )`);
    console.log('Create table product');
    // const update = await connection.query(`UPDATE product SET nama=$1 WHERE id=$2`, ['Baju Putih', 1]);
    // console.log('Update product ', update.rows);

    // const del = await connection.query(`DELETE FROM product WHERE id=$1`, [1]);
    // console.log('Delete product ', del.rows);

    // const count = await connection.query(`SELECT COUNT(*) FROM product`);
    // console.log('Count product ', count.rows);
}

const deleteProduct = async() => {
    await connection.query(`DELETE FROM product`);
    console.log('Delete Product');
}

const saveProduct = (product) => {
    connection.query(`INSERT INTO product 
        (nama, qty, images, description, price)
        VALUES
        ($1, $2, $3, $4, $5)
    `, [product.name, product.stock, JSON.stringify(product.images), product.desc, product.price]);
    console.log('Save Product: ' + product.name);
}

const getProducts = async() => {
    const connect = await connection.connect();
    const select = await connect.query(`SELECT * FROM product`);
    console.log('Get Products');
    return select.rows;
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
    await getList(1);

    const server = Hapi.server({
        port: 3000,
        host: 'localhost'
    });

    server.route({
        method: 'GET',
        path: '/',
        handler: (request, h) => {
            return 'Hello World!';
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
        path: '/clear-products',
        handler: async(request, h) => {
            await deleteProduct();
            return 'Products Cleared!';
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