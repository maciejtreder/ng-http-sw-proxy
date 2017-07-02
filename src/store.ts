import * as idb from 'idb';
import { ObjectStore } from 'idb';

export class Store {
    private db: any = null

    public init():Promise<any> {
        if (this.db) { return Promise.resolve(this.db); }
        return idb.default.open('restRequest', 1, upgradeDb => {
            upgradeDb.createObjectStore('requests', { autoIncrement : true, keyPath: 'id' });
            upgradeDb.createObjectStore('responses', {keyPath: 'id', autoIncrement: false});
        }).then(database => {
            return this.db = database;
        });
    }

    public requests(mode: string): Promise<ObjectStore> {
        return this.init().then(db => {
            return this.db.transaction('requests', mode).objectStore('requests');
        })
    }

    public responses(mode: string): Promise<ObjectStore> {
        return this.init().then(db => {
            return this.db.transaction('responses', mode).objectStore('responses');
        })
    }

    public closeTransaction():Promise<any> {
        return this.db.transaction.complete;
    }
}