/**
 * main.js - Entry point aplikasi Vue
 * 
 * File ini merupakan titik awal eksekusi aplikasi UsahaKu.
 * Berisi inisialisasi Vue app, setup router, dan integrasi library eksternal.
 * 
 * Urutan inisialisasi:
 * 1. Import Vue dan dependencies
 * 2. Import komponen root (App.vue)
 * 3. Import dan setup router
 * 4. Import CSS (Bootstrap + custom)
 * 5. Mount aplikasi ke DOM
 */

import { createApp } from 'vue';
import App from './App.vue';
import router from './router';

// Bootstrap CSS & JS - framework UI untuk tampilan responsif
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap';

// Original custom CSS styling - gaya kustom aplikasi UsahaKu
import '../css/style.css';

/**
 * Membuat instance aplikasi Vue dan mengkonfigurasi plugins
 */
const app = createApp(App);

// Mengaktifkan router untuk navigasi antar halaman
app.use(router);

// Mount aplikasi ke elemen dengan id 'app' di index.html
app.mount('#app');