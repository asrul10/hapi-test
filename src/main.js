import React from 'react';
import ReactDOM from 'react-dom';

class HelloMessage extends React.Component {
    componentDidMount() {
        fetch("/list-products")
            .then(res => res.json())
            .then((result) => {
                console.log(result);
            }, (error) => {
                console.log(error);
            })
    }

    render() {
        return (
            <div>
                Hello {this.props.name}
            </div>
        );
    }
}

ReactDOM.render(
    <HelloMessage name="Taylor" />,
    document.getElementById('hello-example')
);