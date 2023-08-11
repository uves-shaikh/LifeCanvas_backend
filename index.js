const express = require('express')
const cors = require('cors')
const { default: mongoose } = require('mongoose')
const User = require('./models/user')
const Post = require('./models/post')
const app = express()
const bcrypt = require('bcrypt');
const salt = bcrypt.genSaltSync(10);
const jwt = require('jsonwebtoken')
const secret = 'dhhiy4hdjk3jhkjd989hjkds'
const cookieParser = require('cookie-parser')
const multer = require('multer')
const uploadMiddleware = multer({ dest: 'uploads/ ' })
const fs = require('fs')

// const corsOptions = {
//     origin: 'http://localhost:3000', // Your frontend's URL
//     optionsSuccessStatus: 200, // Some legacy browsers (IE11, various SmartTVs) choke on 204
// };

// app.use(cors(corsOptions));


app.use(cors({ credentials: true, origin: 'http://localhost:3000' }))
app.use(express.json())
app.use(cookieParser())
app.use('/uploads', express.static(__dirname + '/uploads'))

mongoose.connect('mongodb+srv://lifecanvas:lifecanvas@cluster0.ezefyqm.mongodb.net/?retryWrites=true&w=majority')

app.post('/register', async (req, res) => {
    const { username, password } = req.body
    try {
        const userDoc = await User.create({
            username,
            password: bcrypt.hashSync(password, salt)
        })
        res.json(userDoc)
    } catch (e) {
        res.status(400).json(e)
    }
})

app.post('/login', async (req, res) => {
    const { username, password } = req.body
    const userDoc = await User.findOne({ username })
    const passOk = bcrypt.compareSync(password, userDoc.password);
    // res.json(passOk)
    if (passOk) {
        // User is logged in
        jwt.sign({ username, id: userDoc._id }, secret, {}, (err, token) => {
            if (err) throw err;
            res.cookie('token', token).json({
                id: userDoc._id,
                username,
            })
        })
    } else {
        res.status(400).json('Wrong Infomation')
    }
})
// mongodb+srv://lifecanvas:lifecanvas@cluster0.ezefyqm.mongodb.net/?retryWrites=true&w=majority

app.get('/profile', (req, res) => {
    const { token } = req.cookies;
    jwt.verify(token, secret, {}, (err, info) => {
        if (err) throw err
        res.json(info)
    })
})

app.post('/logout', (req, res) => {
    res.cookie('token', '').json('ok')
})

app.post('/post', uploadMiddleware.single('file'), async (req, res) => {
    const { token } = req.cookies;
    const { originalname, path } = req.file;
    const parts = originalname.split('.')
    const ext = parts[parts.length - 1]
    const newPath = path + '.' + ext
    fs.renameSync(path, newPath)

    jwt.verify(token, secret, {}, async (err, info) => {
        if (err) throw err
        const { title, summary, content } = req.body;
        const postDoc = await Post.create({
            title,
            summary,
            content,
            cover: newPath,
            author: info.id,
        })
        res.json(postDoc)
    })
})

app.put('/post', uploadMiddleware.single('file'), async (req, res) => {
    let newPath = null
    if (req.file) {
        const { originalname, path } = req.file;
        const parts = originalname.split('.')
        const ext = parts[parts.length - 1]
        newPath = path + '.' + ext
        fs.renameSync(path, newPath)
    }

    const { token } = req.cookies
    jwt.verify(token, secret, {}, async (err, info) => {
        if (err) throw err
        const { id, title, summary, content } = req.body;
        const postDoc = await Post.findById(id)
        const isAuthor = JSON.stringify(postDoc.author) === JSON.stringify(info.id)
        if(!isAuthor) {
             return res.status(400).json('you are not the author')
        }
        let updatedFields = {
            title,
            summary,
            content,
            cover: newPath ? newPath : postDoc.cover,
        };
    
        if (newPath) {
            updatedFields.cover = newPath;
        }
    
        await Post.findOneAndUpdate({ _id: id }, { $set: updatedFields }, { new: true });
    
        res.json(postDoc);
    })
})

app.get('/post', async (req, res) => {
    res.json(await Post.find()
        .populate('author', ['username'])
        .sort({ createdAt: -1 })
        .limit(20)
    )
})

app.get('/post/:id', async (req, res) => {
    const { id } = req.params
    const postDoc = await Post.findById(id).populate('author', ['username'])
    res.json(postDoc)
})

app.listen(4000)