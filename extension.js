// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const  eol = require('os').EOL;
const fs = require('fs');
const gitExtension = vscode.extensions.getExtension('vscode.git').exports;
const api = gitExtension.getAPI(1);

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	// console.log('Congratulations, your extension "codeheader" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	function getBoundaryStart(commentChar, boundaryChar, times, offset) {
		return `${commentChar}${boundaryChar.repeat(times - offset + 2)}${eol}`;
	}

	function getBoundaryEnd(commentChar, boundaryChar, times, offset) {
		return `${boundaryChar.repeat(times - offset + 2)}${commentChar}${eol}${eol}`;
	}

	function getBoundaryMid(boundaryChar, string, width) {
		const strLen = string.length;
		const spaces = ((width - strLen) / 2);
		if(spaces > 0) {
			return `${boundaryChar}${" ".repeat(spaces)}${string}${" ".repeat(strLen % 2 == 0? spaces : spaces + 1)}${boundaryChar}${eol}`;
		} else {
			return `${boundaryChar}${string}${boundaryChar}${eol}`;
		}

	}

	function getTimeAMPMFormat(date) {
		let hours = date.getHours();
		let minutes = date.getMinutes();
		const ampm = hours >= 12 ? 'PM' : 'AM';
		hours = hours % 12;
		hours = hours ? hours : 12;
		hours = hours < 10 ? '0' + hours : hours;
		minutes = minutes < 10 ? '0' + minutes : minutes;
		return hours + ':' + minutes + ' ' + ampm;
	};
	

	let disposable = vscode.commands.registerCommand('addHeader.addHeader', function () {
		// The code you place here will be executed every time your command is executed

		// Display a message box to the user
		const editor = vscode.window.activeTextEditor;
		vscode.window.showInputBox({ prompt: "Description of the code "}).then((description) => {

			if (editor) {
				const document = editor.document;
				addHeader(document, editor, description);
			}
		});	
	});

	context.subscriptions.push(disposable);

	function addHeader(document, editor, description) {
		const language = document.languageId;
		const width = vscode.workspace.getConfiguration('addHeader').get('commentBoxWidth');
		const author = vscode.workspace.getConfiguration('addHeader').get('author');
		const addTimeCreated = vscode.workspace.getConfiguration('addHeader').get('addTimeCreated');
		const addTimeUpdated = vscode.workspace.getConfiguration('addHeader').get('addTimeUpdated');
		const addFileName = vscode.workspace.getConfiguration('addHeader').get('addFileName');
		const addLanguage = vscode.workspace.getConfiguration('addHeader').get('addLanguage');
		const addRepo = vscode.workspace.getConfiguration('addHeader').get('addRepo');
		editor.edit((edit) => {
			const mlCommentChar = {
				open: '',
				close: '',
			};
			let boundaryChar = '';
			switch(language) {
				case 'plaintext': 
				case 'cpp':
				case 'c':
				case 'javascript':
				case 'csharp':
				case 'java':
				case 'go':
				case 'swift':
				case 'php':
				case 'dart':
				case 'kotlin':
					mlCommentChar.open = '/*';
					mlCommentChar.close = '*/';
					boundaryChar = '*'
					break;
				case 'python':
				case 'shellscript':
					mlCommentChar.open = '##';
					mlCommentChar.close = '##';
					boundaryChar = '#'
					break;
				case 'html':
					mlCommentChar.open = "<!"
					mlCommentChar.close = "->"
					boundaryChar = "-";
					break;
				case 'django-html':
					mlCommentChar.open = "{% comment %}"
					mlCommentChar.close = "{% endcomment %}"
					boundaryChar = "-";
					break;
				case 'r':
					mlCommentChar.open = '"'
					mlCommentChar.close = '"'
					boundaryChar = "#";
					break;
				case 'perl':
					mlCommentChar.open = "=pod"
					mlCommentChar.close = "=cut"
					boundaryChar = "";
					break;
			}

			const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
			
			edit.insert(new vscode.Position(0, 0), getBoundaryStart(mlCommentChar.open, boundaryChar, width, mlCommentChar.open.length));
			edit.insert(new vscode.Position(0, 0), getBoundaryMid(boundaryChar, `Author: ${author}`, width));
			
			if(addFileName) {
				const fileName = document.uri.fsPath;
				edit.insert(new vscode.Position(0, 0), getBoundaryMid(boundaryChar, `File Name: ${fileName.substr(fileName.lastIndexOf('\\') + 1)}`, width));
			}
			
			if (addTimeCreated) {
				const stats = fs.statSync(document.uri.fsPath)
				const cDate = new Date(stats.birthtime);
				edit.insert(new vscode.Position(0, 0), getBoundaryMid(boundaryChar, `Creation Date: ${months[cDate.getMonth()]} ${cDate.getDate()}, ${cDate.getFullYear()} ${getTimeAMPMFormat(cDate)}`, width));	
			}

			if (addTimeUpdated) {
				const now = new Date();
				edit.insert(new vscode.Position(0, 0), getBoundaryMid(boundaryChar, `Last Updated: ${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()} ${getTimeAMPMFormat(now)}`, width));
			}


			if(addLanguage) {
				edit.insert(new vscode.Position(0, 0), getBoundaryMid(boundaryChar, `Source Language: ${language}`, width));
			}

			if (addRepo) {
				try {
					const repo = api.repositories[0];
					const repoUri = repo._repository._remotes[0].fetchUrl;
					edit.insert(new vscode.Position(0, 0), getBoundaryMid(boundaryChar, `Repository: ${repoUri}`, width));
				} catch (err) {
					vscode.window.showErrorMessage("Repository Not Found!")
				}
			}

			if	(description) {
				edit.insert(new vscode.Position(0, 0), getBoundaryMid(boundaryChar, "", width));
				edit.insert(new vscode.Position(0, 0), getBoundaryMid(boundaryChar, `--- Code Description ---`, width));
				if (description.length > width - 2) {
					const sentences = [];
					let sentence = '';
					let tempSentence = '';
					let length = 0;
					for (const word of description.split(' ')) {
						tempSentence += `${word} `
						length += word.length + 1;
						if (length < width - 1) {
							sentence = tempSentence;
						} else {
							sentences.push(sentence);
							tempSentence = `${word} `;
							sentence = tempSentence;
							length = word.length + 1;
						}
					}
					sentences.push(tempSentence);
					for (const sentence of sentences) {
						edit.insert(new vscode.Position(0, 0), getBoundaryMid(boundaryChar, sentence, width));	
					}
				} else {
					edit.insert(new vscode.Position(0, 0), getBoundaryMid(boundaryChar, description, width));
				}
			}

			edit.insert(new vscode.Position(0, 0), getBoundaryEnd(mlCommentChar.close, boundaryChar, width, mlCommentChar.close.length));
		});
	}
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
