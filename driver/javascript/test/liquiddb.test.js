const assert = require('assert');
const LiquidDb = require('../dist/node/index.node');

describe('basic', () => {
    it('should create with proper settings', () => {
        const db = new LiquidDb({ address: 'test' });

        assert.notEqual(null, db.settings);
        assert.notEqual(undefined, db.settings);
        assert.equal(db.settings.address, 'test');
    });

    it('should initialize properly', async () => {
        const db = await new LiquidDb().initialize();
        assert.equal(db.socket.ready, true);
        db.socket.close();
    });
});

describe('crud', () => {
    let db;
    let ref;

    before(async () => {
        db = await new LiquidDb().initialize();
        ref = db.ref('foo');
    });

    after(() => {
        db.socket.close();
    });

    afterEach(async () => {
        await db.delete();
    });

    it('should set data and get with value', async () => {
        const data = await ref.set(5);
    });

    it('should set data and get with value', async () => {
        const data = await ref.set(5);
        assert(data.value, 5);
        assert(data.operation, 'insert');

        const value = await ref.value();
        assert(value, 5);
    });

    it('should set data', () => {
        return new Promise(resolve => {
            ref.once('insert', d => {
                assert.equal(d.value, 'test');
                resolve();
            });

            ref.set('test');
        });
    });

    it('should set json and get correctly', () => {
        return new Promise(async resolve => {
            db.ref('foo.bar').once('insert', data => {
                assert.equal(data.value, 5);
                resolve();
            });

            ref.set({
                bar: 5
            });
        });
    });

    it('should delete all data', () => {
        return new Promise(resolve => {
            ref.set({
                bar: 5
            });

            setTimeout(() => {
                db.ref('foo.bar').once('delete', async d => {
                    assert.equal(d.value, 5);
                    const val = await db.ref('foo.bar').value();
                    assert.equal(undefined, val);
                    resolve();
                });

                db.delete();
            }, 15);
        });
    });

    it('should set to whole tree', () => {
        return new Promise(async resolve => {
            db.set({
                foo: {
                    bar: 5
                }
            });

            db.ref(['foo', 'bar']).once('insert', async d => {
                assert.equal(d.value, 5);
                const value = await db.ref('foo.bar').value();
                assert.equal(value, 5);
                resolve();
            });
        });
    });
});

describe('multiple connected sockets', () => {
    const dbs = [];

    before(async () => {
        dbs.push(await new LiquidDb().initialize());
        dbs.push(await new LiquidDb().initialize());
        dbs.push(await new LiquidDb().initialize());
    });

    after(() => {
        dbs.forEach(db => db.socket.close());
    });

    it.only('should set data and get with value', async () => {
        const data = await dbs[0].ref('foo.bar').set(5);
        assert(data.value, 5);
        assert(data.operation, 'insert');

        const value = await dbs[2].ref('foo.bar').value();
        assert(value, 5);
    });
});
