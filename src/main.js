const React = require('react');
const ReactDOM = require('react-dom');
const { decorate, observable, action } = require('mobx');
const { observer } = require('mobx-react');

class Products {
    constructor() {
        this.products = [];
    }

    getAll() {
        fetch("/list-products")
            .then(res => res.json())
            .then((result) => {
                this.products = result;
                console.log(result);
            }, (error) => {
                console.log(error);
            });
    }

    saveProduct(product) {
        let formData = new FormData();
        formData.append('nama', product.nama);
        formData.append('qty', product.qty);
        formData.append('description', product.description);
        formData.append('price', product.price);

        fetch("/product/" + product.id, {method: 'post', body: formData})
            .then(res => res.json())
            .then((result) => {
                console.log(result);
            }, (error) => {
                console.log(error);
            });
    }

    deleteProduct(product) {
        const index = this.getIndexProduct(product);
        fetch("/delete-product/" + product.id)
            .then(res => res.json())
            .then((result) => {
                this.products.splice(index, 1);
                console.log(result);
            }, (error) => {
                console.log(error);
            });
    }

    getIndexProduct(product) {
        return this.products.findIndex((element) => (
            element.id == product.id
        ));
    }

    onChangeProduct(e, product, attr) {
        const index = this.getIndexProduct(product);
        this.products[index][attr] = e.target.value;
    }
}
decorate(Products, {
    products: observable,
    getAll: action.bound,
    deleteProduct: action.bound,
    onChangeProduct: action.bound
});

const products = new Products();
products.getAll();

const ProductsList = observer(({ products }) => (
    <div>
        <div className='columns'>
            {products.products.map(item => (
                <div className="column col-3 col-xs-6" style={{marginBottom: '18px'}}>
                    <div className="card">
                        <div className="card-header">
                            <div className="card-title h5">{item.nama}</div>
                            <div className="card-subtitle text-gray">Stock: {item.qty}</div>
                        </div>
                        <div className="card-image">
                            <img className="img-responsive" src={item.images[0]} alt="image" />
                        </div>
                        <div className="card-body">
                            <h4>{item.price}</h4>
                            <div dangerouslySetInnerHTML={{ __html: (new DOMParser).parseFromString(item.description, 'text/html').body.textContent }} />
                        </div>
                        <hr/>
                        <div className="card-body">
                            <h4>Form Edit</h4>
                            <form>
                                <div className="form-group">
                                    <label className="form-label">Nama</label>
                                    <input className="form-input" type="text" placeholder="Nama" value={ item.nama } onChange={ e => products.onChangeProduct(e, item, 'nama') } />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Stock</label>
                                    <input className="form-input" type="number" placeholder="Qty" value={ item.qty } onChange={ e => products.onChangeProduct(e, item, 'qty') } />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Harga</label>
                                    <input className="form-input" type="number" placeholder="Harga" value={ item.price } onChange={ e => products.onChangeProduct(e, item, 'price') } />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Description</label>
                                    <textarea class="form-input" placeholder="Textarea" rows="3" value={ item.description } onChange={ e => products.onChangeProduct(e, item, 'description') } />
                                </div>
                            </form>
                        </div>
                        <div class="card-footer">
                            <div className="btn-group btn-group-block" style={{marginBottom: '12px'}}>
                                <button onClick={() => products.saveProduct(item)} className="btn btn-primary">Simpan</button>
                                <button onClick={() => products.deleteProduct(item)} className="btn btn-error">Delete</button>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
));

class App extends React.Component {
    render() {
        return (
            <div>
                <ProductsList products={products}></ProductsList>
            </div>
        );
    }
}

ReactDOM.render(
    <App name="Taylor" />,
    document.getElementById('apps')
);