const { text } = require("express");
const { initializeDatabase, queryDB, insertDB } = require("./database");
const bcrypt = require('bcrypt');
const AesEncryption = require('aes-encryption')


const aes = new AesEncryption();
aes.setSecretKey('11122233344455566677788822244455555555555555555231231321313aaaff')

let db;


const initializeAPI = async (app) => {
  db = await initializeDatabase();
  app.get("/api/feed", getFeed);
  app.post("/api/feed", postTweet);
  app.post("/api/login", login);
};

const getFeed = async (req, res) => {
  try {
    const query = "SELECT * FROM tweets ORDER BY id DESC";
    const tweets = await queryDB(db, query);

    // Hier entschlüsseln Sie die Texte serverseitig
    const decryptingTweets = tweets.map(tweet => {
      const decryptingText = aes.decrypt(tweet.text);
      return { ...tweet, text: decryptingText };
    });

    res.json(decryptingTweets);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

const postTweet = async (req, res) => {
  try {
    const { username, text } = req.body;
    const timestamp = new Date().toISOString();

    if (username !== req.user.username) {
      return res.status(403).json({ error: "Nur Posts im Namen der eigenen Identität sind erlaubt." });
    }

    const encryptedText = aes.encrypt(text);

    const query = `INSERT INTO tweets (username, timestamp, text) VALUES ("${username}", "${timestamp}", "${encryptedText}")`;

    await insertDB(db, query)


    res.json({ status: "ok" });
  }
  catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

const login = async (req, res) => {
  const { username, password } = req.body;
  const query = `SELECT * FROM users WHERE username = '${username}'`;
  const user = await queryDB(db, query);
  if (user.length === 0) {
    return console.log("Password oder Benutername Falsch")
  }
  const hash = user[0].password;

  const passwordMatch = await bcrypt.compare(password, hash)

  if (!passwordMatch) {
    return console.log("Password oder Benutername Falsch")
  }

  if (user.length === 1) {
    res.json(user[0]);
  } else {
    res.json(null);
  }
};

module.exports = { initializeAPI };
