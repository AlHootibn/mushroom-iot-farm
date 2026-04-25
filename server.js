const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');

require('./db'); // init DB on startup

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', require('./routes/authRoutes'));
app.use('/', require('./routes/pageRoutes'));
app.use('/api', require('./routes/apiRoutes'));

app.use((req, res) => res.redirect('/login'));

app.listen(PORT, () => {
  console.log(`\n🍄  MycoFarm running → http://localhost:${PORT}`);
  console.log(`    Admin login : admin / admin123`);
  console.log(`    Manager     : manager / manager123`);
  console.log(`    Viewer      : viewer / viewer123\n`);
});
