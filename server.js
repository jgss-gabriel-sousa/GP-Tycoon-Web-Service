require("dotenv").config();

const PORT = process.env.PORT;
const NUMBER_OF_VALID_KEYS = process.env.NUMBER_OF_VALID_KEYS;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const KEY_PREFIX = process.env.KEY_PREFIX;

const express = require('express');
const app = express();
const crypto = require('crypto');
const cors = require('cors');
const fs = require("fs");
const path = require("path");

app.use(express.json());
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", 'GET,PUT,POST,DELETE');
    app.use(cors());
    next();
});

//############################################## GP TYCOON ######################

const validKeys = {};
const startTime = Date.now();
let genValidKeysTime;

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

app.get(`/gp-tycoon/stats`, (req, res) => {
    const sizeOfValidKeysOBJ = roughSizeOfObject(validKeys);
    
    console.log(`Server started at ${new Date().toISOString()}`);
    console.log(`Running on port: ${PORT}`);
    console.log(`Started in ${genValidKeysTime - startTime}ms`);
    console.log(`Object size ${sizeOfValidKeysOBJ/1024000} mb`);
});

//############################################ HEROES AND MONSTERS ###################

const HnMdirectories = [
    "data/hnm/general/",
    "data/hnm/general/classes/",
    "data/hnm/bestiary/",
    "data/hnm/spells/",
    "data/hnm/items/",
    "data/hnm/items/weapons",
];

async function readJSONFile(filePath){
    try {
        const data = await fs.promises.readFile(filePath);
        return JSON.parse(data);

    } catch(err) {
        console.error(`Error reading file: ${filePath}`);
    }
}

app.get(`/hnm/`, (req, res) => {
    const files = {};

    for (const i of HnMdirectories) {
        const dirFiles = fs.readdirSync(i);

        for (let j = 0; j < dirFiles.length; j++) {
            if (!dirFiles[j].includes('.')) {
                dirFiles.splice(j--, 1);
            }
        }

        const trimmedFiles = dirFiles.map(j => j.slice(0, -5));
        trimmedFiles.sort();

        files[i.slice(5, -1)] = trimmedFiles;
    }

    res.send(files);
});

app.get('/hnm/query-:name', async (req, res) => {
    try {
        const name = req.params.name.toLowerCase() + '.json';
        let found = false;
        
        HnMdirectories.forEach(dir => {
            const folderFiles = fs.readdirSync(dir);

            if (folderFiles.includes(name)) {
                const filePath = path.join(__dirname, dir, name);
                found = true;
                res.sendFile(filePath);
            }
        });
    
        if(!found) {
            res.status(404).send(`File not found: ${name}`);
        }
    } catch (err) {
        console.error(err);
    }
});

app.get(`/hnm/:dataType/:jsonFile`, async (req, res) => {
    const fileName = req.params.jsonFile + ".json";
    const dataType = req.params.dataType;
    const filePath = path.join(__dirname, "data/"+dataType, fileName);

    try {
        const data = await readJSONFile(filePath);
        res.status(200).json(data);

    } catch (err) {
        console.error(err);
        res.status(404).send(`File not found: ${filePath}`);
    }
});

//################################################### TEST ##########################

app.post('/t', (req, res) => {
    const key = req.body.key;

    try {
        console.log(key)
        res.status(200).send();
    } catch {
        res.status(500).send();
    }
});

//################################################### GENERAL ##########################

app.get(`/`, (req, res) => {
    res.status(200).send(`Web Server is Online!`);
});

app.listen(PORT, () => {
    genValidKeys();
    genValidKeysTime = Date.now();
});