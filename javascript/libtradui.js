//
// Tradui Core Database Functions
//
// These functions are designed to use TiWrap to be flexible between Google Gears or Titanium
// depending on the platform in use.  The database functions will update from local files or remote
// server data, depending on the URL definitions.
// 
// The main namespaces within this are Schema, which define the SQL needed for creating
// and manipulating the SQLite tables, the Management area for loading and manipulating
// data loads/updates, and Query with utility functions for retrieving phrase data
// from the system.
//
// This library manipulates data for Category, Phrase, and Dictionary information.  Each Category
// is represented by a base category as well as individual translations of that catgory in various
// languages.  Each Phrase is the same, with a single phrase entry and multiple instances of that
// phrase in different languages.  The dictionary is a mapping between a source and destination 
// language and a source and destination word.  Each source may map to one or more destination words.
//
// To use this library, simply call the Tradui.initialize() function, which addresses initializing
// the database and retrieving/processing the xml data.
//
// Dependencies: TiWrap, JQuery
//
// Author: Paul Danckaert (pauld@lemur.org)
//

var Tradui = {

	version:1.0,
	db:'',

	initialize: function() {

		Tradui.Database.openDb();

		var status;

		try {
			status = Tradui.Database.Query.getTraduiStatus();
		} catch (e) {

		}
		
		if (!status || !status.lastUpdated) {
			Tradui.Database.Management.updateDatabase();
		}
	},
	
	Database: {
	
		categoryDataUrl: "xmldata/categories.xml",
		phraseDataUrl: "xmldata/phrases.xml",
		dictionaryDataUrl: "xmldata/word_dictionary.xml",
		dbName: 'database-tradui',

		openDb: function() {
			db = TiWrap.Database.open(this.dbName);
		},
		
		Schema: {
			Drop: {
				traduiStatusTable: 'drop table if exists Tradui_Status',
				categoriesTable: 'drop table if exists Categories',
				categoryTranslationsTable: 'drop table if exists Category_Translations',
				phrasesTable: 'drop table if exists Phrases',
				phraseTranslationsTable: 'drop table if exists Phrase_Translations',
				dictionaryTable: 'drop table if exists Dictionary'
			},
			Create: {
				traduiStatusTable: 
					'create table Tradui_Status ( lastUpdated timestamp )',
				categoriesTable: 'create table Categories (' +
						'categoryId number, imgFile varchar(255))',
				categoryTranslationsTable: 'create table Category_Translations (' +
					'categoryId number, language varchar(32), title varchar(255), ' +
					'audioFile varchar(255))',
				phrasesTable: 'create table Phrases (' +
					'categoryId number, phraseId number, imgFile varchar(255))',
				phraseTranslationsTable: 'create table Phrase_Translations (' +
					'phraseId number, language varchar(32), text varchar(255), ' +
					'audioFile varchar(255))',
				dictionaryTable: 'create table Dictionary ( sourceWord varchar(128), ' +
					'destWord varchar(128), sourceLang varchar(32), destLang varchar(32))'
			},
			Indexes: {
				categoriesIdx: 'create index if not exists c_idx_001 on categories(categoryId);',
				categoryTranslationsIdx: 'create index if not exists ct_idx_001 on category_translations(categoryId,language);',
				phrasesIdx: 'create index if not exists p_idx_001 on phrases(phraseId);',
				phrasesIdx2: 'create index if not exists p_idx_002 on phrases(phraseId, categoryId);',
				phraseTranslationsIdx: 'create index if not exists pt_idx_001 on phrase_translations(phraseId,language);',
				dictionaryIdx: 'create index if not exists d_idx_001 on dictionary(sourceWord, sourceLang)'
			}
		},
		
		Management: {
			initDb: function() {
				db.execute(Tradui.Database.Schema.Drop.traduiStatusTable);
				db.execute(Tradui.Database.Schema.Create.traduiStatusTable);

				db.execute(Tradui.Database.Schema.Drop.categoriesTable);
				db.execute(Tradui.Database.Schema.Drop.categoryTranslationsTable);
				db.execute(Tradui.Database.Schema.Drop.phrasesTable);
				db.execute(Tradui.Database.Schema.Drop.phraseTranslationsTable);
				db.execute(Tradui.Database.Schema.Drop.dictionaryTable);

				db.execute(Tradui.Database.Schema.Create.categoriesTable);
				db.execute(Tradui.Database.Schema.Create.categoryTranslationsTable);
				db.execute(Tradui.Database.Schema.Create.phrasesTable);
				db.execute(Tradui.Database.Schema.Create.phraseTranslationsTable);
				db.execute(Tradui.Database.Schema.Create.dictionaryTable);

				db.execute(Tradui.Database.Schema.Indexes.categoriesIdx);
				db.execute(Tradui.Database.Schema.Indexes.categoryTranslationsIdx);
				db.execute(Tradui.Database.Schema.Indexes.phrasesIdx);
				db.execute(Tradui.Database.Schema.Indexes.phrasesIdx2);
				db.execute(Tradui.Database.Schema.Indexes.phraseTranslationsIdx);
				db.execute(Tradui.Database.Schema.Indexes.dictionaryIdx);
			
				var timestamp = new Date();
				db.execute('insert into Tradui_Status values (?)', [ timestamp.getTime() ]);
			},
			
			updateDatabase: function() {
				db.execute('BEGIN');
				this.initDb();
				this.loadCategories();
				this.loadPhrases();
				this.loadDictionary();
				db.execute('COMMIT');
			},
			
			insertCategory: function(catId, catPic) {
				db.execute('insert into Categories values (?,?)', [ catId, catPic ]);
			},
			
			insertCategoryTranslation: function(catId, language, title, audioFile) {
				db.execute('insert into Category_Translations values (?,?,?,?)',
						[catId, language, title, audioFile]);
			},	
			
			loadCategories: function() {
				var xmlData = TiWrap.TWExtras.readFileContents(Tradui.Database.categoryDataUrl);
				this.parseCategoryXml(xmlData);
			},
			
			parseCategoryXml: function(xml)
			{
				$(xml).find("category").each(function() {
					var catId = $(this).attr("categoryId");
					var catPic = $(this).attr("img");
			
					Tradui.Database.Management.insertCategory(catId, catPic);
			
					$(this).find("cattrans").each(function() {
						var language = $(this).attr("language");
						var audio = $(this).attr("audio");
						var title = $(this).text();
						Tradui.Database.Management.insertCategoryTranslation(catId, 
											language, title, audio);
					});
			
				});
			},
			
			insertPhrase: function(catId, phraseId, phrasePic) {
				db.execute('insert into Phrases values (?,?,?)', [ catId, phraseId, phrasePic ]);
			},
			
			insertPhraseTranslation: function(phraseId, language, text, audioFile) {
				db.execute('insert into Phrase_Translations values (?,?,?,?)',
						[phraseId, language, text, audioFile]);
			},
			
			loadPhrases: function() {
				var xmlData = TiWrap.TWExtras.readFileContents(Tradui.Database.phraseDataUrl);
				this.parsePhraseXml(xmlData);
			},
			
			parsePhraseXml: function(xml)
			{
				$(xml).find("phrase").each(function() {
					var catId = $(this).attr("categoryId");
					var phraseId = $(this).attr("phraseId");
					var catPic = $(this).attr("img");
			
					Tradui.Database.Management.insertPhrase(catId, phraseId, catPic);
			
					$(this).find("phrasetrans").each(function() {
						var language = $(this).attr("language");
						var audio = $(this).attr("audio");
						var text = $(this).text();
						Tradui.Database.Management.insertPhraseTranslation(phraseId, 
											language, text, audio);
					});
			
				});
			},

			insertDictionaryWord: function(source, dest, sourceLang, destLang) {
				db.execute('insert into Dictionary values (?,?,?,?)',
						[source, dest, sourceLang, destLang]);
			},

			loadDictionary: function() {
				var xmlData = TiWrap.TWExtras.readFileContents(Tradui.Database.dictionaryDataUrl);
				this.parseDictionaryXml(xmlData);
			},

			parseDictionaryXml: function(xml)
			{
				$(xml).find("dict").each(function() {
				 $(this).find("term").each(function() {
					var word = $(this).attr("word");
					word = word.toLowerCase();
					$(this).find("value").each(function() {
						var wordValue = $(this).text();
						wordValue = wordValue.toLowerCase();
						Tradui.Database.Management.insertDictionaryWord(word, wordValue, 
												'Creole', 'English');
					});
				 });
				});

				$(xml).find("DicE2K").each(function() {
				 $(this).find("term").each(function() {
					var word = $(this).attr("word");
					word = word.toLowerCase();
					$(this).find("value").each(function() {
						var wordValue = $(this).text();
						wordValue = wordValue.toLowerCase();
						Tradui.Database.Management.insertDictionaryWord(word, wordValue, 
												'English', 'Creole');
					});
				 });
				});
			}
		},
		
		
		Query: {
			getTraduiStatus: function() {
				var sql = "select * from Tradui_Status";
				var rs = db.execute(sql);
				var status = new Object();
				if (rs.isValidRow()) {
					status.lastUpdated = rs.fieldByName('lastUpdated');
				}
				rs.close();
				return status;
			},
			
			getLanguages: function() {
				var sql = "select distinct language from Category_Translations";
				var rs = db.execute(sql);
				var languages = new Array();
				var languageIndex=0;
				while (rs.isValidRow()) {
					var language = rs.fieldByName('language');
					languages[languageIndex++] = language;
					rs.next();
				}
				rs.close();
				return languages;
			},
			
			getCategoryCount: function(categoryId) {
				var sql = "select count(*) from Phrases where categoryId=?";
				var rs = db.execute(sql, [ categoryId ]);
				var count;
				while (rs.isValidRow()) {
					var count = rs.field(0);
					rs.next();
				}
				rs.close();
				return count;
			},
			
			getCategories: function(language) {
				var sql = "select c.*, ct.* from Categories c, Category_Translations ct " +
						"where c.categoryId=ct.categoryId and ct.language=? " +
						"order by ct.title ";
				var rs = db.execute(sql, [ language ]);
				var categories = new Array();
				var categoryIndex = 0;
				while (rs.isValidRow()) {
					var categoryId = rs.fieldByName('categoryId');
					var category = new Object();
					category.categoryId = categoryId;
					category.title = rs.fieldByName('title');
					category.audioFile = rs.fieldByName('audioFile');
					category.count = this.getCategoryCount(categoryId);
					categories[categoryIndex++] = category;
					rs.next();
				}
				rs.close();
				return categories;
			},
			
			getPhrases: function(language, categoryId) {
				var sql = "select p.*, pt.* from Phrases p, Phrase_Translations pt " + 
						"where p.categoryId=? and p.phraseId=pt.phraseId and pt.language=? " +
						"order by pt.text ";
				var rs = db.execute(sql, [ categoryId, language ]);
				var phrases = new Array();
				var phraseIndex = 0;
				while (rs.isValidRow()) {
					var phrase = new Object();
					phrase.phraseId = rs.fieldByName('phraseId');
					phrase.text = rs.fieldByName('text');
					phrase.audioFile = rs.fieldByName('audioFile');
					phrases[phraseIndex++] = phrase;
					rs.next();
				}
				rs.close();
				return phrases;
			},
			
			getPhraseDetails: function(language, phraseId) {
				var sql = "select p.*, pt.* from Phrases p, Phrase_Translations pt " + 
						"where p.phraseId=? and p.phraseId=pt.phraseId and pt.language!=? " +
						"order by pt.language";
				var rs = db.execute(sql, [ phraseId, language ]);
				var phraseDetails = new Array();
				var phraseDetailsIndex = 0;
				while (rs.isValidRow()) {
					var phrase = new Object();
					phrase.text = rs.fieldByName('text');
					phrase.language = rs.fieldByName('language');
					phrase.audioFile = rs.fieldByName('audioFile');
					phraseDetails[phraseDetailsIndex++] = phrase;
					rs.next();
				}
				rs.close();
				return phraseDetails;
			},

			searchDictionary: function(word, sourceLang, destLang) {
				var sql = "select * from Dictionary where sourceWord like ? and sourceLang=? " +
						" and destLang=? ";
				var rs = db.execute(sql, [ word + "%", sourceLang, destLang ]);
				var matchWords = new Array();
				var matchWordsIdx = 0;
				while (rs.isValidRow()) {
					var dictionaryEntry = new Object();
					dictionaryEntry.sourceWord = rs.fieldByName('sourceWord');
					dictionaryEntry.destWord = rs.fieldByName('destWord');
					dictionaryEntry.sourceLang = rs.fieldByName('sourceLang');
					dictionaryEntry.destLang = rs.fieldByName('destLang');
					matchWords[matchWordsIdx++] = dictionaryEntry;
					rs.next();
				}
				rs.close();
				return matchWords;
			}

		}
	}
};
	
		
