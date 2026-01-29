const path = require('path');

// Pastikan path ke folder views diatur dengan benar
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.get('/', (req, res) => {
    // Render file index.ejs yang ada di folder views
    res.render('index', (err, html) => {
        if (err) {
            // Jika masih error, tampilkan pesan spesifik di layar
            return res.status(500).send(`
                <h1>Error View Tidak Ketemu!</h1>
                <p>Express mencari file <b>index.ejs</b> di folder: <code>${path.join(__dirname, 'views')}</code></p>
                <p>Detail: ${err.message}</p>
            `);
        }
        res.send(html);
    });
});