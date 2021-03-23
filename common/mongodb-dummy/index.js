var fs = require('fs');
var BSON = require('bson');
var CryptoJS = require('../../libs/crypto-js.min.js');

class Database {
  constructor(basepath) {
    this.basepath = basepath;
    if (!fs.existsSync(basepath)) {
      fs.mkdirSync(basepath, { recursive: true });
    }
    this.collections = {};
    this.collectionObjs = {};
    this.nameToEnc = {};
    this.upToDate = {};
    var collNames = fs.readdirSync(basepath);
    var name, encryptedName;
    for (var i in collNames) {
      encryptedName = collNames[i];
      name = CryptoJS.AES.decrypt(encryptedName.split('.')[0].replace(/_/g, '/'), process.env.MONGODB_DUMMY_PASS).toString(CryptoJS.enc.Utf8);
      if (/^.*\.dat$/.test(encryptedName)) {
        this.collections[name] = BSON.deserialize(
          Buffer.from(
            CryptoJS.AES.decrypt(
              fs.readFileSync(`${basepath}/${encryptedName}`).toString('base64'),
              process.env.MONGODB_DUMMY_PASS
            ).toString(CryptoJS.enc.Latin1),
            'latin1'
          )
        );
        this.nameToEnc[name] = encryptedName;
        this.upToDate[name] = true;
      }
    }
  }

  collection(name) {
    if (name in this.collectionObjs) return this.collectionObjs[name];
    else return this.collectionObjs[name] = new Collection(this, name);
  }

  _save() {
    var collNames = Object.keys(this.collections);
    var name, encryptedName;
    for (var i in collNames) {
      name = collNames[i];
      encryptedName = this.nameToEnc[name];
      if (!this.upToDate[name])
        fs.writeFileSync(
          `${this.basepath}/${encryptedName}`,
          Buffer.from(
            CryptoJS.AES.encrypt(
              CryptoJS.enc.Latin1.parse(
                BSON.serialize(this.collections[name]).toString('latin1')
              ),
              process.env.MONGODB_DUMMY_PASS
            ).toString(),
            'base64'
          )
        );
    }
  }
}

class Collection {
  constructor(db, name) {
    this.db = db;
    this.name = name;
    if (name in this.db.collections) {
      this.obj = this.db.collections[name];
    } else {
      this.obj = this.db.collections[name] = [];
      this.db.nameToEnc[name] = CryptoJS.AES.encrypt(name, process.env.MONGODB_DUMMY_PASS).toString().replace(/\//g, '_') + '.dat';
    }
  }
}

class MongoClient {
  constructor() {
    this.databases = {};
    this.nameToEnc = {};
    if (!fs.existsSync(`data`)) fs.mkdirSync(`data`);
    var dbNames = fs.readdirSync(`data`);
    var name, encryptedName;
    for (var i in dbNames) {
      encryptedName = dbNames[i];
      name = CryptoJS.AES.decrypt(encryptedName.replace(/_/g, '/'), process.env.MONGODB_DUMMY_PASS).toString(CryptoJS.enc.Utf8);
      this.nameToEnc[name] = encryptedName;
    }
  }

  connect(cb) {
    cb(null);
  }

  db(name) {
    if (typeof name != 'string') throw new Error('database name must be string');
    if (name in this.databases) {
      return this.databases[name];
    } else {
      if (name in this.nameToEnc) {
        var encryptedName = this.nameToEnc[name];
      } else {
        var encryptedName = this.nameToEnc[name] = CryptoJS.AES.encrypt(name, process.env.MONGODB_DUMMY_PASS).toString().replace(/\//g, '_');
      }
      return this.databases[name] = new Database(`data/${encryptedName}`);
    }
  }

  close() {
    this._save();
  }

  _save() {
    var dbs = Object.keys(this.databases);
    for (var i in dbs) {
      this.databases[dbs[i]]._save();
    }
  }
}

module.exports = {
  Database,
  Collection,
  MongoClient,
};