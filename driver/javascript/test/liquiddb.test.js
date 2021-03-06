const assert = require('assert');
const { LiquidDb } = require('../');

describe('DB', () => {
    describe('Basic', () => {
        it('should create with proper settings', () => {
            const db = new LiquidDb({ address: 'test' });

            assert.notEqual(null, db.settings);
            assert.notEqual(undefined, db.settings);
            assert.equal(db.settings.address, 'test');
        });

        it('should initialize properly', async () => {
            const db = await new LiquidDb().connect();
            assert.equal(db.socket.socketOpen, true);
            assert.equal(db.socket.receivedHearthbeat, true);
            db.socket.close();
        });
    });

    describe('Crud', () => {
        let db;
        let ref;

        before(async () => {
            db = await new LiquidDb().connect();
            ref = db.ref('foo');
        });

        after(() => {
            db.close();
        });

        beforeEach(async () => {
            await db.delete();
        });

        it('should delete whole tree twice', async () => {
            await db.delete();
            await db.delete();
        });

        it('should delete only the specified ref', async () => {
            db.set({
                bar: 5
            });

            await ref.set(5);
            assert.equal(await ref.value(), 5);
            assert.equal(await db.ref('bar').value(), 5);

            await ref.delete();
            assert.equal(await db.ref('bar').value(), 5);
            const val = await ref.value();
            assert.equal(val, undefined);
        });

        it('should set data and get with value', async () => {
            const data = await ref.set(5);
            assert.equal(data.value, 5);
        });

        it('should set data and get with value', async () => {
            const data = await ref.set(5);
            assert.equal(data.value, 5);
            assert.equal(data.operation, 'insert');

            const value = await ref.value();
            assert.equal(value, 5);
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
            return new Promise(async resolve => {
                await ref.set({
                    bar: 5
                });

                db.ref('foo.bar').once('delete', async d => {
                    assert.equal(d.value, 5);
                    const val = await db.ref('foo.bar').value();
                    assert.equal(undefined, val);
                    resolve();
                });

                await db.delete();
            });
        });

        it('should set to whole tree', () => {
            return new Promise(async resolve => {
                const ref = db.ref(['foo', 'bar']);
                ref.once('insert', async d => {
                    assert.equal(d.value, 5);
                    const value = await ref.value();
                    assert.equal(value, 5);
                    resolve();
                });

                await db.set({
                    foo: {
                        bar: 5
                    }
                });
            });
        });

        it('should get json', async () => {
            await db.ref('foo').set('test1');

            await db.set({
                foo: {
                    bar: {
                        test: true
                    }
                }
            });

            const val = await db.ref('foo').value();
            assert.deepEqual(val, {
                bar: {
                    test: true
                }
            });
        });

        it('should insert and get array', async () => {
            const arr = [1, 'pesho', 3];

            await db.ref('foo').set(arr);
            const val = await db.ref('foo').value();

            assert.equal(arr[0], val[0]);
            assert.equal(arr[1], val[1]);
            assert.equal(arr[2], val[2]);
        });

        it('should get notification for whole database', async () => {
            const data = {
                test: 1
            };

            await new Promise(async resolve => {
                const unsub = db.data(async data => {
                    assert.equal('insert', data.operation);
                    assert.equal(1, data.value);
                    unsub();

                    const unnsub1 = db.data(data => {
                        assert.equal('update', data.operation);
                        assert.equal('pesho', data.value);
                        unnsub1();
                        resolve();
                    });

                    await db.ref('test').set('pesho');
                });

                await db.set(data);
            });
        });

        it('should get whole tree correctly', async () => {
            await db.set({ test: 1 });

            const data = {
                foo: {
                    bar: {
                        test: true
                    }
                }
            };

            await db.set(data);
            const val = await db.value();

            assert.deepEqual(data, val);
        });
    });

    describe('multiple connected sockets', () => {
        const dbs = [];

        before(async () => {
            dbs.push(await new LiquidDb().connect());
            dbs.push(await new LiquidDb().connect());
            dbs.push(await new LiquidDb().connect());
        });

        after(() => {
            dbs.forEach(db => db.close());
        });

        it('should set data and get with value', async () => {
            dbs[0].delete();
            const data = await dbs[0].ref('foo.bar').set(5);
            assert.equal(data.value, 5);
            assert.equal(data.operation, 'insert');

            const value = await dbs[2].ref('foo.bar').value();
            assert.equal(value, 5);
        });
    });

    describe('reconnect', () => {
        let db;

        before(async () => {
            db = await new LiquidDb().connect();
        });

        after(async () => await db.close());

        it('Should execute operation after reconnection', done => {
            db.close().then(async () => {
                const dbVal = { test: 1 };
                db.set(dbVal);
                db.value().then(val => {
                    assert.deepEqual(val, dbVal);
                    done();
                });

                await db.reconnect();
            });
        });

        it('should receive events after reconnection', done => {
            const dbVal = { test: 1 };

            db.set(dbVal).then(() => {
                db.data(d => {
                    assert.equal(d.operation, 'update');
                    done();
                });

                db.close().then(async () => {
                    await db.reconnect();

                    db.set(dbVal);
                });
            });
        });
    });

    describe('connection events', () => {
        let db;

        before(async () => {
            db = await new LiquidDb().connect();
        });

        it('connected', done => {
            db.close().then(() => {
                db.onConnected(() => done());
                db.reconnect();
            });
        });

        it('disconnected', done => {
            db.onDisconnected(() => done());
            db.close();
        });
    });
});
