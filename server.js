const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const session = require('express-session');

const app = express();
const PORT = 5000;

// ✅ Middleware
app.use(cors({
  origin: ['http://localhost:8080', 'https://gocelebstars.com'], // allow both local + live
  credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  session({
    secret: 'secret-key', // change in production
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // true if using HTTPS
      httpOnly: true,
    },
  })
);

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

// ✅ Celebrity data
const DATA_FILE = path.join(__dirname, 'celebrities.json');
function loadCelebrities() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}
function saveCelebrities(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}
let celebrities = loadCelebrities();
let nextId = celebrities.reduce((max, c) => Math.max(max, c.id || 0), 0) + 1;

// ✅ Login route
app.post('/login', (req, res) => {
  const { phone, password } = req.body;
  if (phone === '9742117232' && password === 'admin123') {
    req.session.isLoggedIn = true;
    return res.json({ success: true });
  }
  res.json({ success: false, error: 'Invalid credentials' });
});

// ✅ Session check
app.get('/session', (req, res) => {
  res.json({ loggedIn: req.session.isLoggedIn === true });
});

// ✅ Logout
app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

// ✅ Get all
app.get('/celebrities', (req, res) => {
  res.json(celebrities);
});

// ✅ Upload setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substr(2)}${ext}`;
    cb(null, uniqueName);
  },
});
const upload = multer({ storage });

// ✅ Add new celeb
app.post('/celebrities', upload.single('image'), (req, res) => {
  if (!req.session.isLoggedIn) {
    return res.status(403).json({ success: false, error: 'Unauthorized' });
  }

  const { name, category, bio } = req.body;
  const image = req.file;

  if (!name || !bio || !image) {
    return res.json({ success: false, error: 'Missing fields' });
  }

  const newCeleb = {
    id: nextId++,
    name,
    category,
    bio,
    image: `http://localhost:5000/uploads/${image.filename}`,
  };

  celebrities.push(newCeleb);
  saveCelebrities(celebrities);

  res.json({ success: true, ...newCeleb });
});

// ✅ Delete celeb
app.delete('/celebrities', (req, res) => {
  if (!req.session.isLoggedIn) {
    return res.status(403).json({ success: false, error: 'Unauthorized' });
  }

  const id = parseInt(req.body.id);
  celebrities = celebrities.filter((c) => c.id !== id);
  saveCelebrities(celebrities);
  res.json({ success: true });
});

app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
