require("dotenv").config();

const PORT = process.env.PORT;
const NUMBER_OF_VALID_KEYS = process.env.NUMBER_OF_VALID_KEYS;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const KEY_PREFIX = process.env.KEY_PREFIX;

const express = require('express');
const app = express();
const crypto = require('crypto');
const cors = require('cors');

app.use(cors());
app.use(express.json());


const validKeys = {};

function generateKey(index){
    const sha256 = crypto.createHash('MD5');
    sha256.update(`${KEY_PREFIX}${index}`, 'utf-8');
    
    let key = sha256.digest('hex');
    key = key.match(/.{1,4}/g);
    key = key.join('-');
    key = key.toUpperCase();

    return key;
};


function validateKey(key){
    return validKeys.hasOwnProperty(key);
};


app.post('/generate-key', (req, res) => {
    const adminPassword = req.body.password;
    const receivedKey = req.body.index;

    if(adminPassword != ADMIN_PASSWORD){
        return res.status(401).send("Senha de Administrador Inválida");
    }

    try {
        res.status(200).send(generateKey(receivedKey));
    } catch {
        res.status(500).send();
    }
});


app.post('/validate-key', (req, res) => {
    const key = req.body.key;

    try {
        const isValid = validateKey(key);

        if (isValid) {

            validKeys[key].timesUsed++;
            validKeys[key].lastTimeUsed = Date.now();

            res.status(200).send(validKeys[key]);
        } else {
            res.status(401).send("Key inválida");
        }
    } catch {
        res.status(500).send();
    }
});


function genValidKeys(){
    for (let i = 0; i < NUMBER_OF_VALID_KEYS; i++) {
        const key = generateKey(i);

        validKeys[key] = {
            key: key,
            timesUsed: 0,
            lastTimeUsed: 0
        };
    }
};

function roughSizeOfObject(object) {
    const objectList = [];
    const stack = [object];
    let bytes = 0;
  
    while (stack.length) {
      const value = stack.pop();
  
      switch (typeof value) {
        case 'boolean':
          bytes += 4;
          break;
        case 'string':
          bytes += value.length * 2;
          break;
        case 'number':
          bytes += 8;
          break;
        case 'object':
          if (!objectList.includes(value)) {
            objectList.push(value);
            for (const prop in value) {
              if (value.hasOwnProperty(prop)) {
                stack.push(value[prop]);
              }
            }
          }
          break;
      }
    }
  
    return bytes;
}

app.listen(PORT, () => {
    const startTime = Date.now();
    genValidKeys();
    const sizeOfValidKeysOBJ = roughSizeOfObject(validKeys);
    const genValidKeysTime = Date.now();
    console.log(`Server started at ${new Date().toISOString()}`);
    console.log(`Running on port: ${PORT}`);
    console.log(`Started in ${genValidKeysTime - startTime}ms`);
    console.log(`Object size ${sizeOfValidKeysOBJ/1024000} mb`);
});