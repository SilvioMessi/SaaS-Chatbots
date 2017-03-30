# SaaS Chatbots [italian documentation]
L'obiettivo di questo progetto è quello di valutare e comparare i principali servizi SaaS per la creazione di chatbots.
I servizi attualmente presi in considerazione sono:
* [API.AI](https://www.api.ai/) - Google
* [WIT.AI](https://wit.ai/) - Facebook
* [LUIS.AI](https://www.luis.ai/) - Microsoft

L'analisi di tali servizi mira a valutare il loro supporto al NLU (natural language understanding), ovvero la loro capacità di analizzare frasi espresse in linguaggio naturale al fine di estrapolare da esse alcune informazioni importanti. In particolare ci si aspetta che da una frase vengano estratti intenti ed entità.

Sono stati trascurati altri aspetti come ad esempio la gestione del contesto.

## Utilizzo

### Creazione dei chatbots
Creare, per ognuno dei servizi indicati precedentemente, un nuovo chatbot. 
Reperire, dalla dashboard, i parametri necessari per l'utilizzo di tali chatbot tramite HTTP API ed inserirli nel file ``js/config.js``.

### Creazione del trainig set e del test set
* editare il file ``training_data/entities.json`` per creare le entità;
* editare il file ``training_data/intents.json`` per creare gli intenti;
* editare il file ``test_data/queries.json`` per creare le queries con cui testare i chatbots.

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
