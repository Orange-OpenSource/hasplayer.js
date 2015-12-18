module.exports = {

    distDir: {
        src: ['<%= path %>'],
        options: {
            force: true
        }
    },

    tmpFiles: {
        src: [
            '<%= path %>/style.css',
            '<%= path %>/json.js',
            '<%= path %>/source',
            './.tmp'
        ],
        options: {
            force: true
        }
    }

};