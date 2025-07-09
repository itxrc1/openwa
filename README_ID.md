[![-----------------------------------------------------](https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/colored.png)](#table-of-contents)
# Open WABOT

Open WABOT adalah sebuah bot WhatsApp yang dirancang seringan mungkin menggunakan modul [Baileys](https://github.com/WhiskeySockets/Baileys).

## Instruksi Pemasangan

Berikut adalah instruksi pemasangan Open WABOT pada beberapa platform.

### Arch Linux

1. Install nodejs, npm, dan git.
    \`\`\`bash
    sudo pacman -S nodejs npm git
    \`\`\`

2. Clone repositori Open WABOT.
    \`\`\`bash
    git clone https://github.com/KilluaBot/open-wabot
    \`\`\`

3. Masuk ke direktori open-wabot dan jalankan npm install.
    \`\`\`bash
    cd open-wabot
    npm install
    \`\`\`

### Debian / Ubuntu

1. Install curl dan git.
    \`\`\`bash
    sudo apt-get install -y curl git
    \`\`\`

2. Unduh dan jalankan setup Node.js.
    \`\`\`bash
    curl -fsSL https://deb.nodesource.com/setup_20.x -o nodesource_setup.sh
    sudo -E bash nodesource_setup.sh
    sudo apt-get install -y nodejs
    \`\`\`

3. Clone repositori Open WABOT.
    \`\`\`bash
    git clone https://github.com/KilluaBot/open-wabot
    \`\`\`

4. Masuk ke direktori open-wabot dan jalankan npm install.
    \`\`\`bash
    cd open-wabot
    npm install
    \`\`\`

## Konfigurasi

Untuk konfigurasi, salin file `config-sample.js` menjadi `config.js` di direktori utama.
\`\`\`js
module.exports = {
    // Konfigurasi mode debug
    debug: false, // Setel ke true untuk mengaktifkan mode debug

    // Konfigurasi fitur anti-panggilan
    antiCall: true, // Setel ke true untuk mengaktifkan fitur anti-panggilan

    // Konfigurasi mode pairing
    usePairing: false, // Setel ke true untuk menggunakan mode pairing

    // Konfigurasi baca otomatis
    autoReadMSG: true, // Selalu menandai pesan sebagai telah dibaca
    autoReadSW: true, // Membuat bot selalu melihat cerita

    // Konfigurasi prefix
    prefixes: ["!", ">", "$", ".", "-", "+", "?", "#", "@", "/", "&", ",", "ow!"], // Tambahkan karakter yang ingin Anda gunakan sebagai prefix

    // Konfigurasi Sesi
    session: {
        type: "local",  // Pilihan: "mongodb", "local"
        url: "mongodb://username:password@host:port/database?options" // Dibutuhkan untuk MongoDB (opsional)
    },

    // Informasi bot
    botName: "Open WABOT", // Nama bot
    botNumber: "6285176765422", // Nomor telepon bot

    // Daftar administrator
    administrator: [
        "6281654976901", // Nomor telepon administrator pertama
        "6285175023755"  // Nomor telepon administrator kedua
    ],

    // Konfigurasi whitelist
    whitelist: false, // Setel ke true untuk mengaktifkan fitur whitelist
    whitelistSrv: "http://localhost:8080/whitelist", // Server yang menyediakan daftar putih
    whitelistMsg: "You are not allowed to use this bot", // Pesan yang dikirim kepada pengguna saat mereka tidak ada di daftar putih
    whitelistUsr: [
        "6285176765422" // Nomor telepon pengguna yang di-whitelist
    ]
};
\`\`\`

### Menggunakan Sesi MongoDB
Untuk menggunakan sesi MongoDB, silakan ikuti langkah-langkah berikut:

1. **Pasang driver sesi MongoDB**  
    Jalankan perintah berikut untuk memasang driver sesi MongoDB:
    \`\`\`bash
    npm run install:mongo
    \`\`\`

2. **Konfigurasikan URL MongoDB**  
    Tambahkan URL MongoDB Anda ke dalam konfigurasi seperti ini:
    \`\`\`js
    session: {
        type: "mongodb",
        url: "mongodb://username:password@host:port/database?options",
    },
    \`\`\`
    **Contoh:**
    \`\`\`js
    session: {
        type: "mongodb",
        url: "mongodb://myUser:myPassword@localhost:27017/myDatabase?retryWrites=true&w=majority",
    },
    \`\`\`

3. **Jalankan bot**  
    Jalankan bot dengan perintah berikut:
    \`\`\`bash
    npm start
    \`\`\`

### Menggunakan Sesi Firebase
Untuk menggunakan sesi firebase, silakan ikuti langkah-langkah berikut:

1. **Pasang driver sesi Firebase**  
    Jalankan perintah berikut untuk memasang driver sesi Firebase:
    \`\`\`bash
    npm run install:firebase
    \`\`\`

2. **Konfigurasikan tipe sesi**  
    Ubah tipe sesi dalam konfigurasi seperti ini:
    \`\`\`js
    session: {
        type: "firebase",
    },
    \`\`\`

3. **Unduh kredensial Firebase**
    Unduh kredensial firebase dari URL berikut dan simpan dengan nama `fireSession.json`
    \`\`\`
    https://console.firebase.google.com/u/0/project/<NamaProject>/settings/serviceaccounts/adminsdk
    \`\`\`

4. **Jalankan bot**  
    Jalankan bot dengan perintah berikut:
    \`\`\`bash
    npm start
    \`\`\`

### Daftar putih

Nomor yang dimasukkan kedalam array daftar putih didalam file konfigurasi bersifat permanen hingga file konfigurasi diubah. Jika ada ingin menambahkan whitelist dalam jangka waktu tertentu, anda bisa menggunakan perintah seperti berikut.
\`\`\`
.whitelist <nomor> <durasi dengan satuan hari>
\`\`\`

Contoh:
\`\`\`
.whitelist 6285176765422 30
\`\`\`

Pada konfigurasi whitelistSrv bisa diisi dengan url server yang akan menerima dan mengembalikan data json seperti berikut.

Data yang akan diterima oleh server.
\`\`\`json
{
    "user": "6285176765422"
}
\`\`\`

Data yang akan dikembalikan oleh server.
\`\`\`json
{
    "whitelisted": true
}
\`\`\`
\`\`\`json
{
    "whitelisted": true
}
\`\`\`

## Penggunaan

Jalankan bot dengan perintah
\`\`\`bash
node controller.js
\`\`\`

## Menambahkan Plugin

Untuk menambahkan plugin, silakan gunakan format berikut:

\`\`\`js
module.exports = {
    admin: false, // Apakah plugin khusus administrator
    gconly: false, // Apakah plugin khusus group
    gcadmin: false, // Apakah plugin khusus admin group
    name: 'name', // Nama fitur yang ditambahkan
    alias: ['alias1', 'alias2'], // Nama lain dari fitur bisa digunakan sebagai perintah alternatif
    category: 'test', // Kategori dari fitur yang ditambahkan
    run: async (m, plugins) => {
        // Disini kodemu dijalankan
        m.reply(result)
    }
}
\`\`\`

## Menambahkan Sesi Balas

Sebuah sesi yang memungkinkan pengguna memberikan perintah untuk melakukan sesuatu dengan membalas pesan yang dikirimkan oleh bot.

\`\`\`js
// Didalam fungsi run plugin
let arrayFunction = [];
arrayFunction.push(async() => {
    // Fungsi untuk melakukan sesuatu
})
arrayFunction.push(async() => {
    // Fungsi kedua untuk melakukan sesuatu
})

let msg = m.reply(content);
bot.sessions.set(msg.key.id, arrayFunction);
\`\`\`

## Fitur Bawaan

Untuk menggunakan fitur bawaan, Anda dapat menjalankan perintah seperti berikut dan mengkonfigurasi file config.plugins.js setelah plugin berhasil menginstal.

\`\`\`bash
npm run install:plugins
\`\`\`

Perlu diperhatikan untuk selalu menyimpan salinan isi konfigurasi plugin karena setiap pembaharuan versi kemungkinan akan tertimpa dengan file konfigurasi yang baru.

## Lisensi

Proyek ini dilisensikan di bawah lisensi yang tertera di file [LICENSE](LICENSE).

## Terimakasih kepada
<table>
  <tr>
    <td align="center"><a href="https://github.com/KilluaBot"><img src="https://github.com/KilluaBot.png?size=100" width="100px;" alt=""/><br /><sub><b>Rusdi Greyrat</b></sub></a><br /><sub><i>Penulis open-wabot</i></sub></td>
        <td align="center"><a href="https://github.com/WhiskeySockets/Baileys"><img src="https://github.com/WhiskeySockets.png?size=100" width="100px;" alt=""/><br /><sub><b>WhiskeySockets - Baileys</b></sub></a><br /><sub><i>Perpustakaan yang digunakan</i></sub></td>
      <td align="center"><a href="https://github.com/adiwajshing"><img src="https://github.com/adiwajshing.png?size=100" width="100px;" alt=""/><br /><sub><b>Adhiraj Singh</b></sub></a><br /><sub><i>Pendiri Baileys</i></sub></td>
      <td align="center"><a href="https://github.com/amiruldev20"><img src="https://github.com/amiruldev20.png?size=100" width="100px;" alt=""/><br /><sub><b>Amirul Dev</b></sub></a><br /><sub><i>Penulis sesi mongodb</i></sub></td>
  </tr>
</table>

- [English Version](README.md)
