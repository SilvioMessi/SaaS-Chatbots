# SaaS Chatbots [italian documentation]
L'obiettivo di questo progetto è quello di valutare e comparare i principali servizi SaaS per la creazione di chatbots.
I servizi attualmente presi in considerazione sono:
* [API.AI](https://api.ai/) - Google
* [WIT.AI](https://wit.ai/) - Facebook
* [LUIS.AI](https://www.luis.ai/) - Microsoft
* MS CHATBOT - Piattaforma di NLU realizzata con la liberira Python [nlu](https://github.com/SilvioMessi/nlu)


L'analisi di tali servizi mira a valutare il loro supporto al NLU (natural language understanding), ovvero la loro capacità di analizzare frasi espresse in linguaggio naturale e di estrapolare da esse alcune informazioni importanti. In particolare ci si aspetta che da una frase vengano estratti intenti ed entità.

Sono stati trascurati altri aspetti come ad esempio la gestione del contesto.

## Utilizzo

### Creazione dei chatbots
Creare, per ognuno dei servizi indicati precedentemente, un nuovo chatbot. 
Reperire, dalla dashboard, i parametri necessari per l'utilizzo di tali chatbot tramite HTTP API ed inserirli nel file ``js/config.js``.

### Creazione del trainig set e del test set
* editare il file ``data/entities.json`` per creare/ampliare le definizioni di entità;
* editare il file ``data/intents.json`` per creare/ampliare le definizioni di intenti;
* eseguire lo script ``js/data_sets_creation.js`` per generare automaticamente il training set  (``data/intents_training_set.json``) e il test set  (``data/intents_test_set.json``) a partire dal data set ``data/intents.json``. È possibile definire la percentuale di data set da allocare per il trainig grazie al parametro (numero decimale compreso tra 0 e 1) che la funzione ``createDataSets`` accetta.

### Fase di training
* eseguire lo script ``js/trainig.js``

Sono necessarie una serie di azioni manuali per completare la fase di training:

* API.AI -> Editare, per ogni intento creato, la lista dei parametri, togliendo eventuali spunte dalla colonna IS LIST. La presenza di queste spunte comporta una serie di problemi, come riportato anche da altri utenti sul [forum](https://discuss.api.ai/t/automatic-islist-being-selected-for-entities-in-intents-during-editing/3539).

* WIT.AI -> Creare manualmente eventuali entità prebuilt (e.g. entità per la rilevazione dei numeri), dato che la creazione di quest'ultime non può essere gestita tramite API.

* LUIS.AI -> Addestrare (Train) e pubblicare (Publish) il chatbot. LUIS prevede, al fine di poter interrogare un chatbot, la pubblicazione di quest'ultimo previa sottoscrizione di un piano tariffario su Azure.

### Fase di testing
* eseguire lo script ``js/test.js``

Verrano generati due files:
* ``results.json`` risultati in formato esteso 
* ``results.csv`` risultati in formato compatto 
* ``metrics_NOME_SEVIZIO.csv`` confusion matrix
