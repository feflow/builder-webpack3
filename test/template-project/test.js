// const assert = require('assert');
const assert = require("assert");
const webpack = require("webpack");
const glob = require("glob-all");
const rimraf = require('rimraf');

const testFileExists = function() {
    describe("smoking test template", function() {
      
      it("should generate webserver including html files", function(done) {
        glob(
          ["./public/webpack/index.html"],
          err => {
            if (!err) {
              done();
            }
          }
        );
      });
      it("should generate category dirctory including js & css files", function(done) {
        glob(
          ["./public/cdn/category/index_*.js", "./public/cdn/category/idnex_*.css"],
          err => {
            if (!err) {
              done();
            }
          }
        );
      });
      it("should generate zip for offline bundle", function(done) {
          glob('./public/offline/offline.zip', err => {
              if (!err) {
                  done()
              }
          })
      })
    });
}


describe("building based on test template", function() {
    it('generate a project with webpack in production mode', function(done) {
        process.chdir(__dirname); // 切换到当前template-project，否则找不到feflow.json
        const builder = require("../../lib/index");
        rimraf('./public', () => {
            webpack(builder.prodConfig, (err, stats) => {
                console.log(stats.toString({
                    chunks: false,
                    children: false
                }))
                done()
                testFileExists()
            })
        })
    });
})

