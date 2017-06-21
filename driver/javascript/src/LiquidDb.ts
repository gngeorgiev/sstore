import { Socket } from './Socket';
import { Reference } from './Reference';
import { ClientOperationDelete, ClientOperationSet } from './ClientData';
import { EventData } from './EventData';

export const LiquidDb = ({ webSocket }: { webSocket: typeof WebSocket }) => {
    interface DbSettings {
        address?: string;
    }

    class LiquidDb {
        private socket: Socket;

        constructor(
            private settings: DbSettings = {
                address: 'ws://localhost:8080/db'
            }
        ) {}

        initialize(): Promise<any> {
            this.socket = new Socket(this.settings.address, webSocket);

            return new Promise(resolve => {
                if (this.socket.ready) {
                    return resolve(this);
                }

                this.socket.once('ready', () => resolve(this));
            });
        }

        ref(path: string | string[]): Reference {
            if (!path) {
                throw new Error(
                    'Invalid ref path, must be in the format "foo.bar" or ["foo", "bar"].'
                );
            }

            if (typeof path === 'string') {
                path = path.split('.');
            }

            //we should not create a reference with empty path since it can delete the whole tree
            if (!path.length) {
                throw new Error(
                    'Invalid ref path, must have at least one level.'
                );
            }

            return new Reference(path, this.socket);
        }

        delete(path: string[]): Promise<EventData> {
            return new Reference([], this.socket).delete();
        }

        set(data: any): Promise<EventData> {
            return new Reference([], this.socket).set(data);
        }
    }

    return LiquidDb;
};
