module.exports = {
    plugins: [
        require('tailwindcss'),
        require('autoprefixer'),
        // require('@fullhuman/postcss-purgecss')({
        //     content: [
        //         './src/**/*.jsx',
        //         './src/**/*.js',
        //         './public/index.html'
        //       ],
        //       css: ['./src/tailwind.css'],
        //     defaultExtractor: content => content.match(/[\w-/:]+(?<!:)/g) || []
        // })
    ]
}