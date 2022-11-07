import {App, DropdownComponent, Modal, Setting} from "obsidian";
import WikiViews from "./main";
import { readdirSync } from 'fs';
import { join as pathJoin } from 'path';
import {Obj} from "tern";

export class InsertTemplate extends Modal {
	plugin: WikiViews;
	template: string;
	templates: Map<string,object>;
	templatePath: string;
	onSubmit: (template: string) => void;

	constructor(
		app: App,
		plugin: WikiViews,
		templates: Map<string,object>,
		templatePath: string,
		onSubmit: (template: string) => void
	) {
		super(app);
		this.plugin = plugin;
		this.templates = templates;
		this.templatePath = templatePath;
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;
		let catSel:DropdownComponent|null = null;

		contentEl.createEl("h1", { text: "Insert Template" });

		new Setting(contentEl).setName("Select Template").addDropdown((dropdown)=>{
				// const fullPath = pathJoin(__dirname, './templates/');
				// let files = readdirSync(fullPath);
				// for(let file of files) dropdown.addOption(fullPath+'/'+file,file);
				for(let [key,template] of this.templates) dropdown.addOption(key,key);
				this.template = dropdown.getValue();
				dropdown.onChange((value)=>{
					this.template = value;
					let template = this.plugin.getTemplate(value);
					if(!template) throw Error('Template Not Found');
					if(catSel&&template.options&&template.options.categories){
						let cats = template.options.categories;
						for(let key in cats) if(cats.hasOwnProperty(key)) catSel.addOption(key,cats[key][0]??cats[key]);
					}
				});
			}
		);

		new Setting(contentEl).setName("Select Category").addDropdown((dropdown)=>{
				catSel = dropdown;
				for(let [key,template] of this.templates) dropdown.addOption(key,key);
				this.template = dropdown.getValue();
				dropdown.onChange((value)=>{ this.template = value; });
			}
		);

		new Setting(contentEl).addButton((btn) =>
			btn .setButtonText("Select")
				.setCta()
				.onClick(()=>{
					if(!this.template) return;
					this.close();
					this.onSubmit(this.template);
				})
		);
	}

	onClose() {
		let { contentEl } = this;
		contentEl.empty();
	}
}
