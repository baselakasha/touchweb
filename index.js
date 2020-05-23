#!/usr/bin/env node
const promise = require("bluebird");
const fs = promise.promisifyAll(require("fs"));
const path = require("path");
const pug = require("pug");
const beautify = require('js-beautify').html;
const inquirer = require('inquirer');
const ncp = promise.promisify(require('ncp').ncp);
const child_process = require('child_process');

const template_folder_path = path.join(__dirname, "/template/");
const node_moudles_path = path.join(__dirname, "/node_modules/");

const questions = [
	// Essintial inputs
	{
		name: 'folder_name',
		type: 'input',
		message: "Enter the new project folder name:",
		validate: (value) =>{
			if(valiateFileName(value) && value.length!=0){
				if(doesFolderExists(`./${value}`)){
					return "Folder already exists, enter a different folder name."
				}
				return true;
			}
			else{
				return "Please check that the folder name is valid and doesn't have special characters";
			}
		}
	},
	{
		name: "title",
		type: "input",
		message: "Enter the home page title: ",
		validate: (value) => {
			return value.length != 0 || "Please enter the home page title";
		}
	},
	{
		name: "indent_with_tabs",
		type: "confirm",
		message: "indent with tabs? "
	},
	{
		name: "language_code",
		type: "input",
		message: "Enter the website language code: ",
		default: "en",
		validate: (value) => {
			return value.length != 0 || "Please enter the website language";
		}
	},
	// SEO meta inputs
	{
		name: "include_seo_meta",
		type: "confirm",
		message: "Include SEO meta tags ?"
	},
	{
		name: "sitename",
		type: "input",
		message: "Enter site name: ",
		when: (response) => {
			return response.include_seo_meta;
		},
		validate: (value) => {
			return value.length != 0 || "Please enter the website name";
		}
	},
	{
		name: "description",
		type: "editor",
		message: "Enter hompage description: ",
		when: (response) => {
			return response.include_seo_meta;
		}
	},
	{
		name: "type",
		type: "input",
		message: "Enter the project og:type: ",
		default: "website",
		when: (response) => {
			return response.include_seo_meta;
		}
	},
	{
		name: "type",
		type: "input",
		message: "Enter the home page url: ",
		when: (response) => {
			return response.include_seo_meta;
		}
	},
	// Address bar color
	{
		name: "is_address_bar_color",
		type: "confirm",
		message: "Include browser address bar color meta tags ?"
	},
	{
		name: "address_bar_color",
		type: "input",
		message: "Enter the address bar color: ",
		when: (response) => {
			return response.is_address_bar_color;
		}
	},
	// Extra libraries
	{
		type: "checkbox",
		name: "extra_libraries",
		message: "Select extra libraries to include",
		choices: [
			{
				name: "FontAwesome",
			},
			{
				name: "NiceScroll"
			}
		]
	},
	// Init npm package inside folder
	{
		type: "confirm",
		name: "is_init_package",
		message: "Initialize npm package inside the project folder?"
	}
];

function valiateFileName(filename){
	// https://richjenks.com/filename-regex/
	return /^(?!.{256,})(?!(aux|clock\$|con|nul|prn|com[1-9]|lpt[1-9])(?:$|\.))[^ ][ \.\w-$()+=[\];#@~,&amp;']+[^\. ]$/i.test(filename);
}
function createFolderInWorkingDirectory(folder_name){
    fs.mkdirSync(`./${folder_name}`);
    return "./" + folder_name + "/";
}
function doesFolderExists(path){
	return fs.existsSync(path);
}

console.log("-- Welcome to touchweb --");

inquirer.prompt(questions).then(answers => {
    console.log("Creating project folder");
    const created_folder_path = createFolderInWorkingDirectory(answers["folder_name"]);

    if(answers["is_init_package"]){
        console.log("Running npm init inside the project folder");
        child_process.execSync(`npm init`, { stdio: 'inherit', cwd: created_folder_path });
        console.log("Package was successfully created...");
    }

    console.log("Creating mainpage..");
    const home_pug_rendered_file = pug.renderFile(template_folder_path + "index.pug", {pretty: true, ...answers});
    const home_beautified = beautify(home_pug_rendered_file, {
        indent_with_tabs: answers["indent_with_tabs"],
        indent_inner_html: true,
        indent_size: 4,
        preserve_newlines: true
    });
    fs.writeFileAsync(`${created_folder_path}index.html`, home_beautified)
    .then(() => {
        console.log("Copying the sass folder...")
        ncp(`${template_folder_path}sass`,`${created_folder_path}sass`)
        .then(() => {
            if(answers["is_init_package"]){
                console.log("Installing bootstrap...");
                child_process.execSync(`npm install bootstrap`, { stdio: 'inherit', cwd: created_folder_path });
                fs.copyFileAsync(`${template_folder_path}bootstrapimport-node.scss`, `${created_folder_path}sass/_bootstrap-include.scss`);
            }
            else{
                console.log("Copying the bootstrap files...");
                fs.copyFileAsync(`${template_folder_path}bootstrapimport-folder.scss`, `${created_folder_path}sass/_bootstrap-include.scss`);
                ncp(`${node_moudles_path}bootstrap`, `${created_folder_path}bootstrap`);
            }
        }).then(() => {
            console.log("Copying the style folder...");
            ncp(`${template_folder_path}style`, `${created_folder_path}style`);

            console.log("Copying the script folder...");
            ncp(`${template_folder_path}script`, `${created_folder_path}script`);
        })
        .then(() => {
            console.log(`Successfully created project in '${created_folder_path}'`);
        });;
    });

});
