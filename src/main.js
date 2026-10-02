import { createApp } from 'vue';
import App from './App.vue';
import router from './router';

// Bootstrap CSS & JS
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap';

// Original custom CSS styling
import '../css/style.css';

const app = createApp(App);
app.use(router);
app.mount('#app');
