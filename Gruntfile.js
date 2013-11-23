module.exports = function(grunt) {

    grunt.loadNpmTasks("grunt-contrib-clean");
    grunt.loadNpmTasks("grunt-contrib-concat");
    grunt.loadNpmTasks("grunt-contrib-copy");
    grunt.loadNpmTasks('grunt-es6-module-transpiler');

    grunt.initConfig({

        config: {
            modules: ['api', 'main'],
            optionalModules: ['mode', 'je/attr', 'je/class', 'je/dom', 'je/event', 'je/html', 'je/selector'],
            excludeModules: [],
            excludeModuleComment: 'API:(__M__)[\\s\\S]*API:(__M__)',
            processFiles: [],
            tmpCopy: '.tmp/',
            tmpTranspiledAMD: '.transpiled.amd/',
            outputFileAMD: 'dist/jquery-evergreen.amd.js',
            outputCJS: 'dist/commonjs/',
            outputFileGlobal: 'dist/jquery-evergreen.js'
        },

        clean: {
            all: ['<%= config.tmpCopy %>', '<%= config.tmpTranspiledAMD %>']
        },

        copy: {
            main: {
                options: {
                    processContent: function(content) {
                        var excludeModules = grunt.config.get('config.excludeModules'),
                            excludeModuleComment = grunt.config.get('config.excludeModuleComment'),
                            excludeRegExp = new RegExp(excludeModuleComment.replace(/__M__/g, excludeModules.join('|')), 'gm');
                        if(excludeModules.length) {
                            content = content.replace(excludeRegExp, '');
                        }
                        return content;
                    }
                },
                files: [
                    {
                        expand: true,
                        cwd: 'src/',
                        src: '<%= config.processFiles %>',
                        dest: '<%= config.tmpCopy %>'
                    }
                ]
            }
        },

        transpile: {
            amd: {
                type: "amd",
                files: [
                    {
                        expand: true,
                        cwd: '<%= config.tmpCopy %>',
                        src: ['**/*.js'],
                        dest: '<%= config.tmpTranspiledAMD %>',
                        ext: '.js'
                    }
                ]
            },
            cjs: {
                type: "cjs",
                files: [
                    {
                        expand: true,
                        cwd: 'src/',
                        src: '**/*.js',
                        dest: '<%= config.outputCJS %>',
                        ext: '.js'
                    }
                ]
            }
        },

        concat: {
            amd: {
                src: '<%= config.tmpTranspiledAMD %>/**/*.js',
                dest: '<%= config.outputFileAMD %>',
                options: {
                    footer: 'define("jquery-evergreen", ["main"], function(main) { return main["default"];});'
                }
            }
        },

        browser: {
            dist: {
                src: ['vendor/amd-loader.js', '<%= config.tmpTranspiledAMD %>/**/*.js'],
                dest: '<%= config.outputFileGlobal %>',
                options: {
                    barename: "main",
                    namespace: "$"
                }
            }
        }
    });

    grunt.registerTask('excludeModules', function() {

        var excludeParam = grunt.option('exclude') || '',
            excludeModules = grunt.config.get('config.excludeModules').concat(excludeParam.length ? excludeParam.split(',') : []),
            optionalModules = grunt.config.get('config.optionalModules'),
            processFiles = grunt.config.get('config.modules');

        optionalModules.forEach(function(module) {
            if(excludeModules.indexOf(module) === -1) {
                processFiles.push(module);
            }
        });

        grunt.config.set('config.excludeModules', excludeModules);
        grunt.config.set('config.processFiles', processFiles.map(function(module) { return module + '.js'; }));

    });

    grunt.registerMultiTask('browser', "Export a module to the window", function() {
        // Borrowed from https://github.com/thomasboyt/grunt-microlib/blob/master/tasks/browser.js
        var opts = this.options();
        this.files.forEach(function(f) {
            var output = ["(function(globals) {"];

            output.push.apply(output, f.src.map(grunt.file.read));

            output.push(grunt.template.process(
                'window.<%= namespace %> = requireModule("<%= barename %>")["default"];', {
                    data: {
                        namespace: opts.namespace,
                        barename: opts.barename
                    }
                }
            ));
            output.push('})(window);');

            grunt.file.write(f.dest, grunt.template.process(output.join("\n")));
        });
    });

    grunt.registerTask('default', [
        'clean',
        'excludeModules',
        'copy:main',
        'transpile',
        'concat:amd',
        'browser',
        'clean'
    ]);
};