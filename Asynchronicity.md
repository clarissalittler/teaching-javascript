# Introduction

This document is going to include a series of examples and exercises for asynchronous programming using both the callback-style of asynchronicity and a promises library to make asynchronous code look more ordered. For these examples, you&rsquo;ll need to have Node installed first and, when you get to promises, run the command

    npm install q

before you start trying to run the code yourself. If you have another promises library you prefer go ahead and install that instead. 

# Synchronous vs. Asynchronous

We&rsquo;ll start with a brief overview of the idea of asynchronous programming. First, code is &ldquo;synchronous&rdquo; when only one thing is happening at a time. In terms of the *syntax* <sup><a id="fnr.1" name="fnr.1" class="footref" href="#fn.1">1</a></sup> of your code, it means that the program flow doesn&rsquo;t continue from one statement <sup><a id="fnr.2" name="fnr.2" class="footref" href="#fn.2">2</a></sup> to the next until the previous statement is **completely** resolved. If it was a function call, then the function will **return** before the next line is executed, if the statement is a loop then the loop will be completely resolved before the first statement after it is executed. 

Almost all plain Javascript code you write is going to be synchronous by default. It&rsquo;s only when we add in libraries such as jQuery or Node that you&rsquo;ll be dealing with asynchronous code. Asynchronous really means that a statement is considered &ldquo;done&rdquo; and the code moves on even though the statement may still be processing. For example, consider the following code that uses the Node filesystem library to access the randomly generated gibberish file `rand.txt` in this directory. 

    fs = require('fs'); //here we load the filesystem module from Node
    var file;
    
    fs.readFile("rand.txt", function (err,res) {
        file = res;
    });
    
    console.log(file);

    undefined

When we run this code, we&rsquo;ll print out `undefined`. Why? Because the callback <sup><a id="fnr.3" name="fnr.3" class="footref" href="#fn.3">3</a></sup> in our call to `readFile` is what sets `file` to be the contents of `rand.txt`. Since `readFile` is asynchronous, it means that we procede to `console.log(file)` **immediately** after the call to `readFile` rather than only after the reading of the file is done. Of course, the right way to do this would have been 

    fs = require('fs');
    fs.readFile("rand.txt", function (err,res) {
        console.log(res.length);
    });

    100000

For convenience of output, we&rsquo;re actually just outputting the length of the file that was read in rather than the entire file.

# Multiple Asynchronous Operations

The previous example was pretty simple: it was just a single callback. What if we wanted to do something a little bit more complicated? Let&rsquo;s consider a harder example that mimics the `cp` shell command. What we&rsquo;re going to write is a function that will 

-   read in a given file
-   write that file to the target path
-   perform an (optional) action when the write is finished

and we will export this function use Node&rsquo;s module system

To start with we have our file `nodecopy.js`

    fs = require('fs');
    function copy(file1, file2, callback) {
        fs.readFile(file1, function (err, res) {
            //Now we're in the body of the callback that runs when readFile hsa finished
            if (err) {
                throw err;
            }
            else {
                // now we pass our top level callback into writeFile so that it executes
                // whenever writeFile finishes
                fs.writeFile(file2, res, callback);
            }
        });
    }
    
    module.exports = copy;

and here we have a small program to test out our example called `copytest.js`

    copy = require('./nodecopy.js');
    
    copy("rand.txt","rand2.txt", function (err) {
        if (err) {
            throw err;
        }
        else {
            console.log("copied");
        }
    });

This was merely the simple case of multiple asynchronous operations because they clearly had a kind of linear ordering: the `writeFile` operation **could not happen** until after the `readFile` was done. We thus say that these operations happen *sequentially*, i.e. there is an ordering to them. What if we there wasn&rsquo;t necessarily an ordering? What if we could have something like multiple reads happening **at the same time**, that is *concurrently*?

For example, let&rsquo;s consider a fairly contrived example of a function that reads from a list of files and returned the name of the longest file of the list of files provided (yes, this is **very** contrived). The way this would work is that we&rsquo;re going to 

-   launch a separate `readFile` for-each file in the array called `files`
-   in each `readFile` we have a callback that
    -   takes the data that was in the file, `data`
    -   records the filename **and** the size of the file in the special `fileSizes` array
    -   checks to see if we&rsquo;re actually **done with all reads** with the comparison `counter == targetSize`
    -   if we&rsquo;re done with all of the reads, then we **sort** the array by the `.size` property of its elements
    -   after sorting, we pass the file name of the last element of `fileSizes` to the callback

filename: largest.js 

    fs = require('fs');
    
    module.exports = function (files, callback) {
        var targetSize = files.length; //for convenience, we store the size of the list of files in a variable
        var fileSizes = new Array(targetSize); //this is where we'll store our calculations about the sizes of all the files
        var counter = 0; //this variable is for keeping track of how many of the files are finished being read. Once all of them have been read, we can finish our callback 
        files.forEach(function (f,i) {
            fs.readFile(f, function (err,data) {
                if (err) {
                    throw err;
                }
                else {
                    fileSizes[i] = {file : f, size: data.length};
                    counter = counter+1;
                    if (counter == targetSize) { 
                        //if all our concurrent reads are done, figure out what the largest file is
                        //and pass that name into the callback
                        fileSizes.sort(function (a,b) { return ( a.size - b.size)});
                        callback(fileSizes[targetSize-1].file);
                    }
                }
            });
        })
    }

and we can test it with the following program

    largest = require('./largest');
    
    var files = ["rand.txt","rand2.txt","rand3.txt"]
    
    largest(files, function (name) {console.log(name);});

and this should print out `rand3.txt`!

How did this program work, though? It worked by the principle of &ldquo;counting callbacks&rdquo;. The basic idea is that if we have a number of asynchronous **concurrent** operations, there is going to be one operation that finishes last. We can&rsquo;t predict which one, though, because we don&rsquo;t know in advance which operations are necessarily going to take the longest. Instead, we need to give each callback the ability to check &ldquo;am I the last to finish?&rdquo; and, if they are, they can then finish the job for all of them.

In our very simple case, the &ldquo;am I last?&rdquo; check is seeing if, after incrementing the counter, the counter is equal to the number of asynchronous calls that were made, then clearly everyone else has already finished their work and it is thus the responsibility of the **last** asynchronous call to process everything that all the other calls have done.

Here&rsquo;s an analogy: imagine if you and your friends were going to vote on where to go for a big road trip. You set aside a box to put your votes in and everyone can just write their vote on a slip of paper and put it in the box. You and your friends prefer to handle things anarchistically, so rather than have a single person in charge of the ballots you just agree that whoever is last has to be the one to count up the votes. How do you know you&rsquo;re last, though? The easiest way is to just count up the number of votes in the ballot and, when it&rsquo;s equal to the number of friends who were voting, then you know the voting is done. This means, though, that each person needs to count the ballots whenever they vote to see if they&rsquo;re the last one. 

On the other hand, our previous example that involve **nested** callbacks is more like passing around an attendance sheet in a classroom. The lecture can start without the entire sheet having been signed first (i.e. it&rsquo;s an *asynchronous* operation), but it&rsquo;s being passed around from one student to the other in an ordered, *sequential* manner. Whenever a student is passed the sign-in sheet, they have an action to take when they&rsquo;re done signing (i.e. a callback) to pass it to the next student or, if they are the last student, to put it on the lecturer&rsquo;s desk.

## Exercises

### Concatenate

Based on our &ldquo;copy&rdquo; function, write a function that will

-   take in four arguments
    -   two input file paths, file1 and file2
    -   an output file path, fileout
    -   a callback, callback
-   concatenate the contents of file2 to the end of the contents of file1
-   write the result into fileout
-   call callback **only if** the write is finished

Test your function on two small files and check to see that it works correctly. You may have this function read the two files either *sequentially* **or** *concurrently*.

### Concatenate Arbitrary

Based on the previous problem and our examples of *ordered*, *concurrent* reads create a function that will

-   take in three arguments
    -   an **array** of file paths
    -   an output file path
    -   a callback
-   concatenate the contents of all of the files provided in the array, **in order**
-   write the result into the output file path
-   call the callback only once the write is completed

You&rsquo;ll need to practice callback counting in this exercise in order to have all of the `readFile` operations happen concurrently

# Promises, Promises

So as we&rsquo;ve seen, having a number of sequential asynchronous operations can be a bit ugly because we&rsquo;re having to nest callbacks inside other callbacks. It can obscure the inherent simplicity in what the code is actually doing.

Promises are an attempt to provide a much cleaner interface to allow you to chain sequential, but still possibily asynchronous, events. In other words, promises are meant to simplify the case of passing the attendance sheet around the room. 

**The rest of this section is still to be filled out soon**

<div id="footnotes">
<h2 class="footnotes">Footnotes: </h2>
<div id="text-footnotes">

<div class="footdef"><sup><a id="fn.1" name="fn.1" class="footnum" href="#fnr.1">1</a></sup> I&rsquo;m not sure if this has been made explicit, but the actual **text** of your program is called the *syntax*, but the **behavior** of your program is the *semantics*. Every programming language has a distinct syntax and semantics, though sometimes the semantics is not well-defined and is presented more as &ldquo;what this implementation of the programming language does&rdquo;. For example, Javascript doesn&rsquo;t have a formally defined semantics (yet) but implementations agree close enough on What Javascript Means that this isn&rsquo;t a problem.</div>

<div class="footdef"><sup><a id="fn.2" name="fn.2" class="footnum" href="#fnr.2">2</a></sup> *Statements* being things like 

-   variables assignments
-   loops
-   function declarations
-   an expression that is by itself on a single line followed by a semi-colon
    -   `5` is an expression `5;` is a statement</div>

<div class="footdef"><sup><a id="fn.3" name="fn.3" class="footnum" href="#fnr.3">3</a></sup> Alright, this is a little bit of a rant on my part. I don&rsquo;t like the generic term &ldquo;callback&rdquo; in Javascript-culture. In asynchronous programming, we are doing **actual** callbacks: functions that are run only after the end of some asynchronous operation. Calling things like the function argument to `.forEach` a callback I think muddies the waters. Javascript, unlike many early programming languages such as C and its descendants, allows you to easily pass functions as arguments to other functions. Calling an argument that happens to be a function a new term such as callback makes it seem like there&rsquo;s some special difference between functions and any other kind of value. There really isn&rsquo;t! Javascript is a &ldquo;functional&rdquo; language in the sense that functions are ordinary values like any other.</div>


</div>
</div>
