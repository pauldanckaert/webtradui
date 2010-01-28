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

	initialize: function(successCallback, failureCallback) {

		if (!TiWrap.isActive) {
			return false;
		}

		Tradui.Database.openDb();

		var initializeSuccess = function(result) {
			successCallback(result);
		}

		var initializeFailure = function(err) {
			Tradui.Database.Management.updateDatabase(successCallback, failureCallback);
		}

		Tradui.Database.Query.getTraduiStatus(initializeSuccess, initializeFailure);
		
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
				statements: [
					'drop table if exists Tradui_Status ',
					'drop table if exists Categories ',
					'drop table if exists Category_Translations ',
					'drop table if exists Phrases ',
					'drop table if exists Phrase_Translations ',
					'drop table if exists Dictionary ' 
						]
			},
			Create: {
				statements: [
					'create table Tradui_Status ( lastUpdated timestamp )',
					'create table Categories ( categoryId number, imgFile varchar(255) )',
					'create table Category_Translations ( categoryId number, language varchar(32), ' +
						'title varchar(255), audioFile varchar(255) )',
					'create table Phrases ( categoryid number, phraseId number, imgFile varchar(255) )',
					'create table Phrase_Translations ( phraseId number, language varchar(32), ' +
						'text varchar(255), audioFile varchar(255) )',
					'create table Dictionary ( sourceWord varchar(128), destWord varchar(128), ' +
						'sourceLang varchar(32), destLang varchar(32) )'
						]
			},
			Indexes: {
				statements: [
					'create index if not exists c_idx_001 on categories(categoryId)',
					'create index if not exists ct_idx_001 on category_translations(categoryId,language)',
					'create index if not exists p_idx_001 on phrases(phraseId)',
					'create index if not exists p_idx_002 on phrases(phraseId, categoryId)',
					'create index if not exists pt_idx_001 on phrase_translations(phraseId,language)',
					'create index if not exists d_idx_001 on dictionary(sourceWord, sourceLang)'
						]
			}
		},
		
		Management: {
			initDb: function() {

				for (var i=0; i<Tradui.Database.Schema.Drop.statements.length; i++) {
					db.execSql(Tradui.Database.Schema.Drop.statements[i]);
				}

				for (var i=0; i<Tradui.Database.Schema.Create.statements.length; i++) {
					db.execSql(Tradui.Database.Schema.Create.statements[i]);
				}

				for (var i=0; i<Tradui.Database.Schema.Indexes.statements.length; i++) {
					db.execSql(Tradui.Database.Schema.Indexes.statements[i]);
				}
			
				var timestamp = new Date();
				db.execSql('insert into Tradui_Status values (?)', [ timestamp.getTime() ]);
			},
			
			updateDatabase: function() {
				this.initDb();
				this.loadCategories();
				this.loadPhrases();
				this.loadDictionary();
			},
			
			insertCategory: function(catId, catPic) {
				db.execSql('insert into Categories values (?,?)', [ catId, catPic ]);
			},
			
			insertCategoryTranslation: function(catId, language, title, audioFile) {
				db.execSql('insert into Category_Translations values (?,?,?,?)',
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
				db.execSql('insert into Phrases values (?,?,?)', [ catId, phraseId, phrasePic ]);
			},
			
			insertPhraseTranslation: function(phraseId, language, text, audioFile) {
				db.execSql('insert into Phrase_Translations values (?,?,?,?)',
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
				db.execSql('insert into Dictionary values (?,?,?,?)',
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
			getTraduiStatus: function(success, failure) {
				var sql = "select * from Tradui_Status";
				db.selectSql(sql, [], function(result) {
						if (result) success(result[0]);
						else failure;
					}, failure);
			},
			
			getLanguages: function(success, failure) {
				var sql = "select distinct language from Category_Translations";
				db.selectSql(sql, [], function(result) {
						if (result) {
							for (var i=0; i<result.length; i++) {
								result[i] = result[i].language;
							}
						}
						success(result); }, failure);
			},
			
			getCategoryCount: function(categoryId, success, failure) {
				var sql = "select count(*) from Phrases where categoryId=?";
				var rs = db.selectSql(sql, [ categoryId ], success, failure);
			},
			
			getCategories: function(language, success, failure) {
				var sql = "select c.*, ct.* from Categories c, Category_Translations ct " +
						"where c.categoryId=ct.categoryId and ct.language=? " +
						"order by ct.title ";
				var rs = db.selectSql(sql, [ language ], success, failure);
			},
			
			getPhrases: function(language, categoryId, success, failure) {
				var sql = "select p.*, pt.* from Phrases p, Phrase_Translations pt " + 
						"where p.categoryId=? and p.phraseId=pt.phraseId and pt.language=? " +
						"order by pt.text ";
				db.selectSql(sql, [ categoryId, language ], success, failure);
			},
			
			getPhraseDetails: function(language, phraseId, success, failure) {
				var sql = "select p.*, pt.* from Phrases p, Phrase_Translations pt " + 
						"where p.phraseId=? and p.phraseId=pt.phraseId and pt.language!=? " +
						"order by pt.language";
				db.selectSql(sql, [ phraseId, language ], success, failure);
				var phraseDetails = new Array();
			},

			//
			// Dictionary Retrieval Functions
			//
			getDictionary: function(word, sourceLang, destLang, success, failure) {
				var sql = "select * from Dictionary where sourceWord=? and sourceLang=? " +
						" and destLang=? ";
				db.selectSql(sql, [ word, sourceLang, destLang ], success, failure);
			},

			searchDictionary: function(word, sourceLang, destLang, success, failure) {
				var sql = "select * from Dictionary where sourceWord like ? and sourceLang=? " +
						" and destLang=? ";
				db.selectSql(sql, [ word + "%", sourceLang, destLang ], success, failure);
			}

		}
	}, 

	Translation: {

		baseUrl: 'http://api.microsofttranslator.com/V1/Http.svc/Translate?appId=',
		appId: 'D22BA898FA9C62112AA0F10BCBF7F84BD1FAB2D3',

		getTranslation: function(text, sourceLang, destLang) {
			var transUrl = Tradui.Translation.baseUrl + Tradui.Translation.appId + 
					'&from=' + sourceLang + '&to=' + destLang + '&text=' + text;
			var transData = TiWrap.TWExtras.readFileContents(transUrl);
			return transData;
		}
	}

};
	
		
