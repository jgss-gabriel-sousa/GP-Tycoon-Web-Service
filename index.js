require("dotenv").config();

const express = require('express');
const bodyParser = require('body-parser');
const uuid = require('uuid');
const nodemailer = require('nodemailer');
const cors = require('cors');
const fs = require('fs');

const app = express();
const port = process.env.PORT;
const email_from = process.env.EMAIL;
const email_password = process.env.EMAIL_PASSWORD;
const email_service = process.env.EMAIL_SERVICE;
const admin_password = process.env.ADMIN_PASSWORD;

let keys = {};
let usedKeys = {};

try {
    const keysFile = fs.readFileSync("keys.json");
    keys = JSON.parse(keysFile);

    const usedKeysFile = fs.readFileSync("usedKeys.json");
    usedKeys = JSON.parse(usedKeysFile);
} catch (err) {
    console.error(`Erro ao ler arquivo de chaves: ${err}`);
}

// Configura o Nodemailer para enviar e-mails
const transporter = nodemailer.createTransport({
    service: email_service,
    auth: {
        user: email_from,
        pass: email_password,
    }
});

app.use(bodyParser.json());

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", 'GET,PUT,POST,DELETE');
    app.use(cors());
    next();
});

function updateKeysFile(){
    try {
        fs.writeFileSync("keys.json", JSON.stringify(keys));
        fs.writeFileSync("usedKeys.json", JSON.stringify(usedKeys));
    } catch (err) {
        console.error(`Erro ao salvar arquivo de chaves: ${err}`);
        return res.status(500).send("Erro ao salvar arquivo de chaves");
    }
}

app.post("/register", (req, res) => {
    const { name, email } = req.body;

    if (!/\S+@\S+\.\S+/.test(email)) {
        return res.status(400).send("E-mail inválido");
    }

    const key = keys[Math.floor(Math.random() * keys.length)];    

    if (!usedKeys[key] || usedKeys[key] < 3) {
        transporter.sendMail({
            from: email_from,
            to: email,
            subject: "Sua chave para acessar o GP Tycoon",
            text: `Olá ${name}, aqui está sua chave para acessar o GP Tycoon: ${key}`
        }, (error, info) => {
            if (error) {
                console.error(error);
                return res.status(500).send("Erro ao enviar e-mail");
            } else {
                usedKeys[key] = usedKeys[key] ? usedKeys[key] + 1 : 1;
                updateKeysFile();

                return res.status(200).send("Chave enviada por e-mail");
            }
        });
    } else {
        return res.status(400).send("Chave já foi usada o número máximo de vezes permitido");
    }
});

app.get("/game/:key", (req, res) => {
    const { key } = req.params;

    if (keys.includes(key) && (!usedKeys[key] || usedKeys[key] < 3)) {
        usedKeys[key] = usedKeys[key] ? usedKeys[key] + 1 : 1;
        updateKeysFile();

        return res.status(200).send("Acesso ao jogo liberado");
    } else {
        return res.status(400).send("Chave inválida ou já foi usada o número máximo de vezes permitido");
    }
});

app.get("/generate-key", (req, res) => {
    const { password } = req.body;

    if(password != admin_password) res.status(400).send("Senha de Admin inválida");

    const key = uuid.v4();
  
    keys.push(key);

    updateKeysFile();
  
    return res.status(200).json({ key });
});

app.listen(port, () => {
    console.log(`Server running on port: ${port}`);
});