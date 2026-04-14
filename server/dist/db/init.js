"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./index");
(0, index_1.initDB)()
    .then(() => {
    console.log('Database setup complete');
    process.exit(0);
})
    .catch((err) => {
    console.error('Database setup failed:', err);
    process.exit(1);
});
//# sourceMappingURL=init.js.map