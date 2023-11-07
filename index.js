async function Session(method,UrlParamObj,body){
    this.mysqlConnection=await dbPool.acquire();
    
}

//此函数只用于解析excel第一个表格，并返回对象数据；
function excelParse(path){
    const xlsx=require('xlsx');
    const workbook=xlsx.readFile(path);
    let firstSheetName=workbook.SheetNames[0];
    // console.log('第一个表格名为：',firstSheetName)
    let firstSheet=workbook.Sheets[firstSheetName];
    const data=xlsx.utils.sheet_to_json(firstSheet);
    // console.log(data);
    return data;
}

// let data=excelParse('./班级学生信息初始化模板.xlsx');
// console.log('外部读取data数据',data);

//数据库连接池的定义
const mysql = require('mysql');
var dbPool=mysql.createPool({
    connectionLimit:10,
    connectTimeout:180,
    host: '121.40.110.179',
    user: 'luckydraw',
    password: 'J4niAEFjmMHPFy8b',
    port: 3306,
    database: 'luckydraw'
})


const url=require('url')
const express=require('express')
const session=require('express-session')
const app=express()
const port =7007


// 程序主体
app.use(session({
    secret:'qazplm123789-+=',
    resave:false,
    saveUninitialized:true
}))


app.get('/',(req,res)=>{
    let fullUrl=`${req.protocol}://${req.get('host')}${req.url}`;
    let urlObj=new URL(fullUrl);
    let category=urlObj.searchParams.get('category');
    dbPool.getConnection((err,connection)=>{
        if(category){
            switch(category){
                //对于case块中，let 定义的变量，只会在自身case块中起作用
                //不用担心变量冲突
                case 'drawUIInitialize':
                    let classID=urlObj.searchParams.get('classID');
                    let subjectID=urlObj.searchParams.get('subjectID');
                    let startDate=urlObj.searchParams.get('startDate');
                    let endDate=urlObj.searchParams.get('endDate');
                    
                    break;
                case 'draw':
                    break;
                case 'exam':
                    break;
                case 'work':
                    break;
                case 'task':
                    break;
                
            };
        }else{
            
        };
    })
    


    res.send('hello,express');
})


app.post('/insert',(req,res)=>{
    dbPool.getConnection((err,connection)=>{
        if(err){
            console.log('数据库连接池获取连接失败')
            return;
        }
        else{
            if(req.body.tableType=='studenttask'){
                // 前端body格式  body:{tableType:'studenttask',data:studenttaskList};
                let dataList=req.body.data;
                //在这里应当将里面的日期数据做一些处理后再查询
                
                connection.query('insert into studenttask(studentID,typename,subjectID,score,releaseDate) values ?',
                    dataList,
                    (err,results)=>{
                        if(err){
                            console.log('数据库插入学生任务失败！')
                        }
                        console.log('results');
                    })
                
            }
            
            res.send('Your http type is post.');
        }
    })
})


// 定义multer文件处理
const multer=require('multer');
const { Console } = require('console');
const { resolve } = require('path');
const storage=multer.diskStorage({
    destination:function(req,file,cb){
        cb(null,'./upload');
    },
    filename:function(req,file,cb){
        cb(null,file.originalname);
    }
})
const upload=multer({storage:storage});

//处理所有上传的文件
app.post('/upload',upload.single('excel'),(req, res)=>{

    // 将excel文件转化为js对象数组
    let objList=excelParse(req.file.path);

    //将数字类型转化为js的日期对象……
    objList.forEach((element)=>{
        Object.keys(element).forEach((key)=>{
            if(key.includes('Date')||key.includes('日期')){
                element[key];
                let msPerDay=24*60*60*1000;
                let excelStartDay=new Date(1899,11,30);
                const jsDate=new Date(excelStartDay.getTime()+(element[key])*msPerDay);
                element[key]=jsDate;
            };
        })
    })
    // console.log(req.body);
    console.log(objList[0]['标题'],'biaoti');

    //获取数据库连接，并根据参数不同表格执行不同的查询操作
    dbPool.getConnection((err,connection)=>{
        if(err){
            console.log('数据库连接池获取连接失败')
            return;
        }
        else{
            //对于新生信息初始化表格的处理
            if(req.body.tableType=='newStudentInitialize'){
                console.log('success!');
                var classIDObj=new Object();
                var cadreIDObj=new Object();
                let theFlag=0;
                let initilID=new Promise((reslove,reject)=>{
                    objList.forEach((element)=>{
                        if(!(element.className in Object.keys(classIDObj))){
                            classIDObj[element.className.toString()]=0;
                            connection.query('CALL insertNewClass(?,?,?,?)',
                            [element.school,element.grade.toString(),element.classSeqNum,element.className.toString()],
                            (err,results)=>{
                                if(err){
                                    reject();
                                    console.log('班级插入失败，信息：',err.message);
                                }
                                console.log('class');
                                classIDObj[element.className.toString()]=JSON.parse(results[0][0].classInfo).classID;
                            })
                        }
                    })
                    objList.forEach((element)=>{
                        if(element.cadreName && !(Object.keys(cadreIDObj).includes(element.cadreName))){
                            cadreIDObj[element.cadreName]=0;
                            console.log('本次cadreName是：',cadreIDObj[element.cadreName]);
                            connection.query('CALL insertNewCadre(?)',
                            [element.cadreName],
                            (err,results)=>{
                                if(err){
                                    reject();
                                    console.log('职位插入失败，信息：',err.message);
                                    
                                }
                                
                                if(Object.keys(cadreIDObj).length==++theFlag) reslove();
                                console.log('实时长度：',theFlag);
                                cadreIDObj[element.cadreName]=JSON.parse(results[0][0].cadreInfo).cadreID;
                                console.log('本次cadreName是：',element.cadreName,'值为：',cadreIDObj[element.cadreName]);
                                
                            })
                        }
                    })
                })
                
                // var theFlag=Object.keys(cadreIDObj).length;
                initilID.then(()=>{
                    objList.forEach((element)=>{
                        let cadreIDTemp=cadreIDObj[element.cadreName]||null;
                        
                        connection.query('CALL '+ 'studentInitialize(?,?,?, ?,?,?, ?,?)',
                            [element.name_,element.sex,element.identifierStr,
                            element.termBeginDate,classIDObj[element.className.toString()],element.studentSeqNum,
                            cadreIDTemp,element.studentSeat],    
                            (err,results)=>{
                                    if(err){
                                        throw err;
                                    }else{
                                        console.log('结果是：',results);
                                    }
                                }
                        )
                    })
    
                })
            }else if(req.body.tableType=='newStudentExam'){
                console.log(objList,'对象列表');
                
                new Promise((resolve,reject)=>{
                    connection.query('select id from exams where title=?',objList[0]['标题'],(err,results)=>{
                        if(err){
                            console.log(err.message,' 查询数据库考试标题出错');
                            // 查询数据库考试标题出错
                        }else{
                            console.log('结果',results);
                            //如果id不为空，说明考试信息已经录入数据库，不需要插入操作了。
                            if(results){
                                reject('当前考试信息已经存在于数据库，不需要重复插入')
                            }else{
                                connection.query('insert into exams(title,details,classID,subjectsID,invigilation,releaseDate) value(?,?,?,?,?,?)')
                                resolve();
                            } 
                        }
                    })
                }).then(
                    ()=>{
                    //插入新的考试信息表，并记录id值
                    },
                    ()=>{

                    }
                ).then(()=>{
                    //插入所有的学生考试信息
                })
            }else if(req.body.tableType=='newStudentWork'){
                console.log(objList,'所有信息');

                new Promise((resolve,reject)=>{
                    connection.query('select id from works where title=?',objList[0]['标题'],(err,results)=>{
                        if(err){
                            console.log(err.message,' 查询数据库作业标题出错');
                            // 查询数据库作业标题出错
                        }else{
                            //如果id不为空，说明考试信息已经录入数据库，不需要插入操作了。
                            if(1){
                                reject('当前作业信息已经存在于数据库，不需要重复插入')
                            }else{
                                resolve();
                            } 
                        }
                    })
                }).then(()=>{
                    //插入新的作业信息表，并记录id值
                }).then(()=>{
                    //插入所有的学生作业信息
                })
            }
        }
    })




    


    res.send('Your http type is post.');
})


app.listen(port,(err)=>{
    if(err){
        console.log(`错误信息是：${err.message}`);
    }
    console.log(`服务器正在监听${port}端口`)
})