module.exports = {

    start: {
        src: ['<%= path %>'],
        options: {
            force: true
        }
    },

    end: {
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