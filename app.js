const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const conn = require('./db').conn;
const courseTable = require('./db').courseTable;
const usersTable = require('./db').usersTable;
const cmmtsTable = require('./db').cmmtsTable;
const phpPassword = require("node-php-password");
const mysql = require('mysql');
const puppeteer = require('puppeteer');

app.use(
    bodyParser.urlencoded({
        extended: false,
    })
);
app.use(bodyParser.json());
app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    // res.setHeader('Content-Type', 'application/json');
    next();
});
// //跟course有關的
// 1. 爬回來的資料存到資料庫去
// 2. 這邊改keyword就可以讓他去爬蟲，暫時先註解掉，免得一直爬
// (async () => {
// 	let keyword = '社群';
// 	const browser = await puppeteer.launch({
// 		headless: false,
// 		args: ['--no-sandbox'],
// 	});
// 	const page = await browser.newPage();

// 	await page.goto(
// 		'https://www.taiwanjobs.gov.tw/internet/index/CourseQuery_step.aspx?a=1&coloerstyleid=3&coloerstyleid_2=2&rabl_train_sv=-2'
// 	);
// 	await page.focus('#CPH1_tbOtherGovKeyWord');
// 	await page.keyboard.type(keyword);

// 	const inputElement = await page.$('#CPH1_btnOtherGovSubmit');
// 	await inputElement.click();

// 	//等待几秒
// 	await _sleep();
// 	const textContent = await page.evaluate(() =>
// 		[...document.querySelectorAll('#CPH1_lv_govcourse_itemPlaceholderContainer tbody tr:not(:first-child) td')]
// 			.map(elem => elem.innerText)
// 			.join('\n')
// 	);
// 	console.log(textContent);
// 	const responseArr = textContent
// 		.replace(/\s│\s/g, '~')
// 		.replace(/\s["("]/g, '(')
// 		.replace(/\n/g, ' ')
// 		.trim()
// 		.split(' ');
// 	const arrresult = [];
// 	let obj = {};
// 	// console.log(responseArr);
// 	for (let i = 0; i < responseArr.length; i++) {
// 		if (i % 6 == 0) {
// 			obj.name = responseArr[i];
// 		}

// 		if (i % 6 == 1) {
// 			obj.place = responseArr[i];
// 		}

// 		if (i % 6 == 2) {
// 			obj.hold = responseArr[i];
// 		}

// 		if (i % 6 == 3) {
// 			obj.dateone = responseArr[i];
// 		}

// 		if (i % 6 == 4) {
// 			obj.datetwo = responseArr[i];
// 		}

// 		if (i % 6 == 5) {
// 			obj.classtime = responseArr[i];
// 			arrresult.push(obj);
// 			obj = {};
// 		}
// 	}

// 	// 存到資料庫去
// 	console.log(arrresult);

// 	conn.query(
// 		{
// 			sql: 'INSERT INTO ?? (keyword, result) VALUES (?, ?)',
// 			values: [courseTable, keyword, JSON.stringify(arrresult)],
// 		},
// 		(error, results) => {
// 			if (error) {
// 				throw error;
// 			} else {
// 				console.log('ok!!你好棒');
// 			}
// 			//  res.send('ok');
// 		}
// 	);
// 	browser.close();
// })();
// 讓他可以停十秒鐘
async function _sleep() {
    console.log('開始爬');
    await sleep(10000);
    console.log('結束爬');
}

//
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 設定cors + content type

// 2. 抓到course post過來的isActive的標籤
app.post('/course', function (req, res) {
    console.log(req.body.keyword[0]);
    // 用for迴圈
    let resultArr = [];
    for (let i = 0; i < req.body.keyword.length; i++) {
        conn.query({
                sql: 'SELECT result FROM course WHERE keyword = "' + req.body.keyword[i] + '"',
                //   values: [cmmtsTable, cmmt_id]
            },
            (error, results) => {
                if (error) throw error;
                let keywordArr = JSON.parse(results[0].result);
                // console.log(resultArr)
                for (let j = 0; j < keywordArr.length; j++) {
                    resultArr.push(keywordArr[j]);
                    if (j == keywordArr.length - 1 && i == req.body.keyword.length - 1) {
                        res.send(resultArr);
                    }
                }
            }
        );
        // console.log("這邊開始是要回傳的資料", resultArr);
    }

    // console.log(resultArr);
    // 從資料庫撈跟req.body有關的資料
});

// 跟login logout有關的

// 1. 註冊機制，寫資料進資料庫，如果沒有重複，寫進去，密碼加密
app.post('/signup', function (req, res) {
    console.log(req.body.signup);
    conn.query({
            sql: 'SELECT email , nickname FROM ?? WHERE email=? OR nickname=?',
            values: [usersTable, req.body.signup.email, req.body.signup.nickname]
        },
        (error, results) => {
            if (error) throw error;
            if (results.length === 0) {
                // 檢查是否有重複的暱稱或email，同一個email不可以註冊兩次
                conn.query({
                    sql: 'INSERT INTO ?? (email, password, nickname) VALUES (?, ?, ?)',
                    values: [usersTable, req.body.signup.email, phpPassword.hash(req.body.signup.pwd), req.body.signup.nickname]
                    // 不存明碼

                }, (error, results) => {
                    if (error) throw error;
                    res.send('ok');
                });
            } else {
                res.send('error');
            };

        }
    );
});
// 2. 登入機制，檢查輸入的資料是否符合資料庫的
app.post("/signin", function (req, res) {
    console.log(req.body);
    conn.query({
        sql: 'SELECT id, email, password, nickname FROM ?? WHERE email = ?',
        values: [usersTable, req.body.signin.email]

    }, (error, results) => {
        if (error) console.log("Oops... Something went wrong");
        if (results.length !== 0) {
            // console.log(results);
            // 驗證results回傳回來的是一個json格式，所以需要選取第一筆results[0]
            if (phpPassword.verify(req.body.signin.pwd, results[0].password)) {
                res.send(results[0].nickname); //回傳給前端的response data
            } else {
                // 
                res.send('pwderror');
            }
        } else {
            res.send('accerror');
        };

    });
})


// 3. 在前端設定cookie(react-cookie)

// 跟論壇讀寫有關的

app.post("/blogEdit", function (req, res) {
    conn.query({
        sql: 'INSERT INTO ?? (comment, title, nickname,category,parent_id) VALUES (?, ?, ?, ?, ?)',
        values: [cmmtsTable, req.body.comment.comment, req.body.comment.title, req.body.comment.nickname, req.body.comment.category, 0]
        // 不存明碼

    }, (error, results) => {
        if (error) throw error;
        res.send('ok'); //代表有成功在資料庫裏面新建這筆資料
    });
    // 送到資料庫去
})
// 1. 父留言子留言
// 2. 誰留言的，可以抓cookie的資料

// 論壇
// 拿到第一頁的資料前五筆
app.post("/firstpage", function (req, res) {
    conn.query({
        sql: 'SELECT title , nickname , id , parent_id , time , comment FROM ?? WHERE parent_id=0 AND category=? ORDER BY time DESC LIMIT 0, 5',
        values: [cmmtsTable, req.body.category]
    }, (error, results) => {
        res.send(results);
        if (error) throw error;

    });
})

//拿到單篇文章
app.post("/eacharticle", function (req, res) {
    //去資料庫找這筆資料
    conn.query({
        sql: 'SELECT title , nickname , time , comment FROM ?? WHERE id=?',
        values: [cmmtsTable, req.body.id]
    }, (error, results) => {
        res.send(results);
        if (error) throw error;

    });
})

// 把子留言放進資料庫裏面
app.post("/child_cmmt", function (req, res) {
    conn.query({
        sql: 'SELECT category FROM ?? WHERE id=?',
        values: [cmmtsTable, req.body.parent_id],

    }, (error, results) => {
        console.log(results[0].category)
        if (error) throw error;
        conn.query({
            sql: 'INSERT INTO ?? (comment, parent_id, nickname, title, category) VALUES (?, ?, ?, ?, ?)',
            values: [cmmtsTable, req.body.child_cmmt, req.body.parent_id, req.body.nickname, "", results[0].category],
        }, (error, results) => {
            res.send("ok");
            if (error) throw error;

        });
    });
})

//把子留言render在頁面上
app.post("/get_child_cmmt", function (req, res) {
    console.log(req.body.id);
    conn.query({
        sql: 'SELECT * FROM ?? WHERE parent_id=? ORDER BY time DESC',
        values: [cmmtsTable, req.body.id],

    }, (error, results) => {
        res.send(results);
        if (error) throw error;
    });
})





// 開啟端口3001
app.listen(3001, () => console.log('伺服器開啟3001端口'));