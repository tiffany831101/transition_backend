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
const cron = require("node-cron");


app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    // res.setHeader('Content-Type', 'application/json');
    next();
});
app.use(bodyParser.json());
//arr(keep) minus arr(removed elements in arr)
Array.prototype.diff = function (a) {
    return this.filter(function (i) {
        return a.indexOf(i) < 0;
    });
};


cron.schedule("0 0 0 * * *", function () {
    async function pickfriend() {
        try {
            //id and friend arrs
            let allIds = await conn.query('SELECT id FROM users ORDER BY id ASC');
            let idArr = allIds.map(user => (user.id)) //step1 : registered id till now;
            let allFriends = await conn.query('SELECT friend FROM users ORDER BY id ASC')
            let friendArr = allFriends.map(user => (user.friend).split(",").map(str => Number(str))) //step2 : int arr represents the friends u've got till now!

            //step 3 : clear up the friend list u've got
            //[all id lists] - [friend list]
            for (let i = 0; i < idArr.length; i++) {
                let allSelected = await conn.query('SELECT selected FROM users ORDER BY id ASC'); //被別人選走的
                let selectedArr = allSelected.map(list => list.selected) //has been selected by others today(cant be selected again)
                let idminusfriend = idArr.diff(friendArr[i]); //ids-friends
                let canSelectToday = idminusfriend.diff(selectedArr); //id-friends-selected
                console.log(idArr[i], canSelectToday.length);
                //no friend can be selected today
                if (canSelectToday.length == 0) return;
                // if (canSelectToday.length !== 0) {
                let hasBeenSelected = await conn.query(`SELECT selected FROM users WHERE id=${idArr[i]}`)
                // console.log(typeof (hasBeenSelected[0].selected));
                if (hasBeenSelected[0].selected === 0) {
                    let randomNum = Math.floor(Math.random() * (canSelectToday.length))
                    let todayfriend = canSelectToday[randomNum];
                    // console.log("here");
                    // console.log(todayfriend, canSelectToday.length)
                    let selectOthers = await conn.query(`UPDATE users SET selected = ${todayfriend} WHERE id = ${idArr[i]}`);
                    let selectedByOthers = await conn.query(`UPDATE users SET selected = ${idArr[i]} WHERE id = ${todayfriend}`);
                    console.log(idArr[i] + "今天的朋友是" + todayfriend)
                    // console.log(todayfriend + "今天的朋友是" + idArr[i])
                } else {
                    console.log("跑到下面了");
                } //代表已經" 被 "別人選走了
            }

        } catch (err) {
            throw new Error(err)
        }
    }
    pickfriend();
})

cron.schedule("00 00 18 * * *", function () {
    async function reset() {

        try {
            console.log("reseting...")
            let resetSelectToZero = await conn.query(`UPDATE users SET selected = 0`);
            let allAgreeToZero = await conn.query(`UPDATE users SET agree = 0`);
        } catch (err) {
            throw new Error(err)
        }
    }
    reset();
})

// 每天中午12點清空全部selected和全部agree


app.use(
    bodyParser.urlencoded({
        extended: false,
    })
);

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
                    sql: 'INSERT INTO ?? (email, password, nickname,friend) VALUES (?, ?, ?, ?)',
                    values: [usersTable, req.body.signup.email, phpPassword.hash(req.body.signup.pwd), req.body.signup.nickname, ""]
                    // 不存明碼

                }, (error, results) => {
                    if (error) throw error;
                    conn.query({
                        sql: 'SELECT id FROM ?? WHERE email=?',
                        values: [usersTable, req.body.signup.email]
                        // 不存明碼

                    }, (error, results) => {
                        if (error) throw error;
                        let ownId = results[0].id;
                        conn.query({
                            sql: `UPDATE users SET friend="${ownId}" WHERE id = ${ownId}`,

                            // 不存明碼

                        }, (error, results) => {
                            if (error) throw error;
                            res.end('ok');
                        });

                    });


                });
            } else {
                res.end('error');
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
                res.end(results[0].nickname); //回傳給前端的response data
            } else {
                // 
                res.end('pwderror');
            }
        } else {
            res.end('accerror');
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
        res.end('ok'); //代表有成功在資料庫裏面新建這筆資料
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

app.post("/child", function (req, res) {
    console.log(req.body.parent_id);

    conn.query({
        sql: 'SELECT nickname , id , time , comment FROM ?? WHERE parent_id=?',
        values: [cmmtsTable, req.body.parent_id]
    }, (error, results) => {
        res.send(results);
        if (error) throw error;
    });
})

//知道有幾頁
app.post("/pagination", function (req, res) {
    conn.query({
        sql: `SELECT COUNT(title) FROM ${cmmtsTable} WHERE category = "${req.body.category}" AND parent_id = 0`,
    }, (error, results) => {
        console.log(results);
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
            res.end("ok");
            if (error) throw error;

        });
    });
})

//把子留言render在頁面上
app.post("/get_child_cmmt", function (req, res) {
    console.log(req.body.id);
    conn.query({
        sql: 'SELECT * FROM ?? WHERE parent_id=? ORDER BY time ASC',
        values: [cmmtsTable, req.body.id],

    }, (error, results) => {
        res.send(results);
        if (error) throw error;
    });
})


app.post("/otherpage", function (req, res) {
    let category = req.body.category;
    let page = req.body.page;
    let num = (page - 1) * 5;
    console.log("數字在這裡", num);
    conn.query({
        sql: 'SELECT title , nickname , id , parent_id , time , comment FROM ?? WHERE parent_id=0 AND category=? ORDER BY time DESC LIMIT ?, 5',
        values: [cmmtsTable, req.body.category, num],
    }, (error, results) => {
        res.send(results);
        if (error) throw error;
    });
})

// pagination
app.post("/pagination", function (req, res) {
    let category = req.body.category;
    console.log(category);
})





// 開啟端口3001




// 要不要跳出加好友的modal框
// app.post("/choosefriend", function (req, res) {
//     let id = req.body.id;
//     conn.query({
//         sql: 'SELECT selected FROM usertable where id = ?',
//         values: [id],
//     }, (error, results) => {
//         res.send(results); //因為settimeout 會定時去改select框
//         if (error) throw error;
//     })
//     // 定時去更改
//     setTimeout(conn.query({
//         sql: 'SELECT id FROM usertable',
//         values: [cmmtsTable, req.body.id],
//     }, (error, results) => {
//         if (error) throw error;
//         //把選到的id隨機配對成二維陣列
//         // 以下用id代表user，暫時沒加blacklist功能
//         // let friendlistToday = [[1,3],[2,4],[5,6]]
//         // 去db把select update成對方的id
//         for (let i = 0; i < friendlistToday.length; i++) {
//             for (let j = 0; j < 2; j++) {
//                 conn.query({
//                     sql: "把自己的select框更新成對方的"
//                 }, (error, results) => {})
//             }
//         }
//     }), 86400000)//設定成一天
// })

app.post("/addfriend", function (req, res) {
    // console.log(req.body.nickname);
    async function addfriend() {
        let idToday = await conn.query(`SELECT selected FROM users WHERE nickname = "${req.body.nickname}"`);
        let friendToday = await conn.query(`SELECT nickname FROM users WHERE id = ${idToday[0].selected}`)
        let alreadyAgree = await conn.query(`SELECT agree FROM users WHERE nickname = "${req.body.nickname}"`)
        // console.log(alreadyAgree[0].agree);
        if (idToday[0].selected == 0) {
            res.send(friendToday); //傳回去是一個空陣列
        } else {
            if (alreadyAgree[0].agree === 0) {
                res.send(friendToday);
            }
        }
        // res.send(friendToday) //如果不是0就代表有朋友抽
    }
    addfriend();
})

app.post("/agreeadd", function (req, res) {
    let answer = req.body;
    console.log(answer);
    // 不管怎麼樣select都歸零，
    //如果要加好友，先把select歸零，把agree改成1，確定對方也要加他好友之後，放進friend名單李
    //如果不要加好友，一樣把select歸零，agree不變
    async function agreefriend() {
        // let selectReset = await conn.query(``)
        try {
            if (answer.agree === "yes") {
                let id = await conn.query(`SELECT id FROM users WHERE nickname = "${req.body.nickname}"`)


                let agree = await conn.query(`UPDATE users SET agree = 1 WHERE id = ${id[0].id}`)
                let checkfriendagree = await conn.query(`SELECT agree FROM users WHERE nickname = "${req.body.friend}"`)
                let friendId = await conn.query(`SELECT id FROM users WHERE nickname = "${req.body.friend}"`)

                if (checkfriendagree[0].agree == 1) {
                    let resetAgreeYours = await conn.query(`UPDATE users SET agree = 0 WHERE nickname = "${req.body.nickname}"`)
                    let resetSelected = await conn.query(`UPDATE users SET selected = 0 WHERE id = ${id[0].id}`) //for u

                    let selectOrigin = await conn.query(`SELECT friend FROM users WHERE nickname = "${req.body.nickname}"`) //自己的要加入對方的
                    let friendList = (selectOrigin[0].friend);
                    let newFriendList = friendList + "," + friendId[0].id
                    let updatefriend = await conn.query(`UPDATE users SET friend = "${newFriendList}" WHERE nickname = "${req.body.nickname}"`)

                    //for your friend
                    let selectOriginFriend = await conn.query(`SELECT friend FROM users WHERE nickname = "${req.body.friend}"`) //自己的要加入對方的
                    let friendListFriend = (selectOriginFriend[0].friend);
                    let newFriendListFriend = friendListFriend + "," + id[0].id
                    let updatefriendFriend = await conn.query(`UPDATE users SET friend = "${newFriendListFriend}" WHERE nickname = "${req.body.friend}"`)
                    let resetAgreeFriend = await conn.query(`UPDATE users SET agree = 0 WHERE nickname = "${req.body.friend}"`)
                    let resetSelectedFriend = await conn.query(`UPDATE users SET selected = 0 WHERE nickname = "${req.body.friend}"`)
                } else if (checkfriendagree[0].agree == 2) {
                    let resetSelectedAgree = await conn.query(`UPDATE users SET selected = 0 WHERE id = ${id[0].id}`)
                    let resetDisagreeYours = await conn.query(`UPDATE users SET agree = 0 WHERE nickname = "${req.body.nickname}"`)
                    let resetDisagreeFriend = await conn.query(`UPDATE users SET agree = 0 WHERE nickname = "${req.body.friend}"`)
                    let resetSelectedFriendAgree = await conn.query(`UPDATE users SET selected = 0 WHERE nickname = "${req.body.friend}"`)
                    // 不能把朋友加進去，不管是因為還沒案還是因為放棄
                }

            } else if (answer.agree === "no") {

                let id = await conn.query(`SELECT id FROM users WHERE nickname = "${req.body.nickname}"`)

                let resetSelectedDisagree = await conn.query(`UPDATE users SET selected = 0 WHERE id = ${id[0].id}`)
                let disagree = await conn.query(`UPDATE users SET agree = 2 WHERE id = ${id[0].id}`)
                let checkfriendagree = await conn.query(`SELECT agree FROM users WHERE nickname = "${req.body.friend}"`)
                let friendId = await conn.query(`SELECT id FROM users WHERE nickname = "${req.body.friend}"`)

                if (checkfriendagree[0].agree == 1) {
                    //for u

                    let resetYoursAgree = await conn.query(`UPDATE users SET agree = 0 WHERE nickname = "${req.body.nickname}"`)
                    //for your friend

                    let resetFriendAgree = await conn.query(`UPDATE users SET agree = 0 WHERE nickname = "${req.body.friend}"`)
                    let resetSelectedFriendDisagree = await conn.query(`UPDATE users SET selected = 0 WHERE nickname = "${req.body.friend}"`)
                } else if (checkfriendagree[0].agree == 2) {
                    //for u

                    let resetYoursDisagree = await conn.query(`UPDATE users SET agree = 0 WHERE nickname = "${req.body.nickname}"`)
                    //for your friend

                    let resetFriendDisagree = await conn.query(`UPDATE users SET agree = 0 WHERE nickname = "${req.body.friend}"`)
                    let resetSelectedFriend = await conn.query(`UPDATE users SET selected = 0 WHERE nickname = "${req.body.friend}"`)
                    // 不能把朋友加進去，不管是因為還沒案還是因為放棄
                }

            }
        } catch (err) {
            if (err) console.log(err)
        }
        // let idToday = await conn.query(`SELECT selected FROM users WHERE nickname = "${req.body.nickname}"`);
        // let friendToday = await conn.query(`SELECT nickname FROM users WHERE id = ${idToday[0].selected}`)
        // console.log(friendToday);

        // res.send(friendToday) //如果不是0就代表有朋友抽
    }
    agreefriend();
})


app.post("/incomeanswer", function (req, res) {
    console.log(req.body.result);

})


app.listen(3001, () => console.log('伺服器開啟3001端口'));