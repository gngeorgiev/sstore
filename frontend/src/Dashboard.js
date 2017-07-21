import React, { Component } from 'react';
import JSONTree from 'react-json-tree';
import PropTypes from 'prop-types';

export class Dashboard extends Component {
    static propTypes = {
        db: PropTypes.any.isRequired
    };

    state = {
        data: {}
    };

    async componentDidMount() {
        const { db } = this.props;

        const refresh = async () => {
            const data = await db.value();
            this.setState({ data });
        };

        this._dataUnsubscribe = db.data(refresh);

        refresh();
    }

    componentWillUnmount() {
        this._dataUnsubscribe();
    }

    render() {
        return (
            <JSONTree data={this.state.data} shouldExpandNode={() => true} />
        );
    }
}
