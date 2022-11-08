import {App, DropdownComponent, Modal, Setting} from "obsidian";
import WikiViews from "./main";
import {Arr} from "tern";
import {type} from "os";

export class InsertTemplate extends Modal {
	plugin: WikiViews;
	template: string;
	templateTags: Array<string>;
	category: string|null;
	categoryTags: Array<string>;
	templates: Map<string,object>;
	templatePath: string;
	onSubmit: (template: string,category: string|null,tags: Array<string>) => void;

	constructor(
		app: App,
		plugin: WikiViews,
		templates: Map<string,object>,
		templatePath: string,
		onSubmit: (template: string,category: string|null,tags: Array<string>) => void
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
					this.templateTags = template.tags??[];
					if(catSel&&template&&template.categories){
						let cats = template.categories;
						for(let key in cats) if(cats.hasOwnProperty(key)){
							let cat = cats[key];
							let name = key;
							if(Array.isArray(cat)) name = cat[0];
							else if(typeof cat === 'string') name = cat;
							else if(Array.isArray(cat.name)) name = cat.name[0];
							else if(typeof cat.name === 'string') name = cat.name;
							catSel.addOption(key,name);
						}
						this.category = catSel.getValue()??null;
						this.categoryTags = [];
						let cat = cats[this.category];
						if(cat && cat.tags) this.categoryTags = cat.tags;
					}
				});
			}
		);

		new Setting(contentEl).setName("Select Category").addDropdown((dropdown)=>{
				catSel = dropdown;
				this.category = dropdown.getValue()??null;
				dropdown.onChange((value)=>{ this.category = value; });
			}
		);

		new Setting(contentEl).addButton((btn) =>
			btn .setButtonText("Select")
				.setCta()
				.onClick(()=>{
					if(!this.template) return;
					this.close();
					this.onSubmit(this.template,this.category,[...this.templateTags,...this.categoryTags]);
				})
		);
	}

	onClose() {
		let { contentEl } = this;
		contentEl.empty();
	}
}
