module.exports = {
    apps: [{
        name: 'amazing-surveys',
        script: 'dist/src/main.js',
        instances: 1,
        exec_mode: 'fork',
        watch: true
    }]
};
