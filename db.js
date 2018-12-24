var mysql = require("mysql");
var util = require('util')

var conn = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "",
    database: "transition",
    // 是否可以包含sql multiple statements
    multipleStatements: true
});
// 測試是否連線成功
conn.getConnection(function (err) {
    if (err) {
        console.log('連線失敗');
        console.log(err)
        return;
    }
    console.log('連線成功');
});

conn.query = util.promisify(conn.query)

module.exports = {
    conn: conn,
    courseTable: "course",
    usersTable: "users",
    cmmtsTable: "comments",
}

// console.log(conn);
// conn本身就是執行完物件裡的connect方法後回傳的結果，所以其他再引入的時候不用再寫connect()