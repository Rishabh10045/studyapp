/* Lesson J31: GC tuning basics & memory leaks */
(function () {
  "use strict";
  var H = window.JAVA, M = H.M;

  // Recorded on JDK 21 (G1, -Xmx64m -Xlog:gc -XX:+HeapDumpOnOutOfMemoryError): Leaky.java serves up to 300,000 fake
  // requests (each with a 1 KB payload) in one of five modes, leaky and fixed. series = [uptime s, pause kind, heap after GC MB,
  // pause ms]; histo = top of `jcmd <pid> GC.class_histogram` taken mid-run; suspect = biggest retained object in the
  // OOM heap dump, computed by a small HPROF reader (dominator tree + shortest path from a GC root, like Eclipse MAT).
  var REC = {"audit|leak":{"served":52931,"ms":379,"alloc_mb":57,"oom":"java.lang.OutOfMemoryError: Java heap space","series":[[0.088,"Young",28,9.148],[0.094,"Young",38,4.423],[0.29,"Full",37,12.602],[0.312,"Young",44,2.095],[0.315,"Young",49,1.8],[0.317,"Young",52,0.961],[0.319,"Young",56,1.195],[0.321,"Young",61,0.838],[0.323,"Young",62,0.755],[0.333,"Full",58,10.726],[0.335,"Young",62,0.801],[0.336,"Young",63,0.696],[0.346,"Full",62,9.581],[0.347,"Young",63,0.507],[0.356,"Full",63,8.63],[0.369,"Full",63,13.293],[0.37,"Young",63,0.324],[0.381,"Full",63,10.974],[0.392,"Full",63,11.366],[0.427,"Young",63,0.28],[0.435,"Full",42,7.683]],"kinds":{"Young":13,"Full":8},"log":["[0.088s] GC(0) Pause Young (Normal) (G1 Evacuation Pause) 29M->28M(64M) 9.148ms","[0.094s] GC(1) Pause Young (Normal) (G1 Evacuation Pause) 38M->38M(64M) 4.423ms","[0.392s] GC(21) Pause Full (G1 Compaction Pause) 63M->63M(64M) 11.366ms","[0.427s] GC(22) Pause Young (Normal) (G1 Evacuation Pause) 63M->63M(64M) 0.280ms","[0.435s] GC(23) Pause Full (G1 Compaction Pause) 63M->42M(64M) 7.683ms"],"histo":[["[B",67188,35652944],["java.lang.String",37946,910704],["Leaky$Request",29000,696000],["[Ljava.lang.Object;",1485,274312],["java.lang.Class",1840,225744]],"histoAt":29000,"dump_mb":66.6,"suspect":{"total":62.5,"root":"class Leaky","mb":61.2,"pct":97.9,"path":[["AUDIT","java.util.ArrayList"],["elementData","java.lang.Object[]"]],"acc":"java.lang.Object[]","children":[["Leaky$Request",52931]],"n":52931}},"audit|fixed":{"served":300000,"ms":85,"alloc_mb":329,"oom":null,"series":[[0.076,"Young",6,1.231],[0.092,"Young",6,0.726],[0.102,"Young",6,0.694],[0.111,"Young",6,1.6],[0.118,"Young",6,0.99],[0.126,"Young",6,1.051],[0.13,"Young",6,1.028],[0.133,"Young",6,0.76],[0.136,"Young",6,0.577]],"kinds":{"Young":9},"log":["[0.076s] GC(0) Pause Young (Normal) (G1 Evacuation Pause) 29M->6M(64M) 1.231ms","[0.092s] GC(1) Pause Young (Normal) (G1 Evacuation Pause) 43M->6M(64M) 0.726ms","[0.130s] GC(6) Pause Young (Normal) (G1 Evacuation Pause) 43M->6M(64M) 1.028ms","[0.133s] GC(7) Pause Young (Normal) (G1 Evacuation Pause) 43M->6M(64M) 0.760ms","[0.136s] GC(8) Pause Young (Normal) (G1 Evacuation Pause) 43M->6M(64M) 0.577ms"],"histo":[],"histoAt":null},"cache|leak":{"served":51848,"ms":458,"alloc_mb":109,"oom":"java.lang.OutOfMemoryError: Java heap space","series":[[0.072,"Young",17,5.875],[0.083,"Young",24,5.398],[0.091,"Young",31,4.342],[0.101,"Young",37,3.241],[0.107,"Remark",40,0.39],[0.11,"Cleanup",40,0.068],[0.294,"Full",36,11.592],[0.315,"Young",42,1.937],[0.319,"Young",47,2.006],[0.322,"Young",50,1.482],[0.323,"Remark",52,0.355],[0.325,"Young",53,1.02],[0.327,"Young",56,1.147],[0.328,"Young",57,1.002],[0.33,"Young",62,0.787],[0.34,"Full",56,10.011],[0.341,"Young",58,0.523],[0.343,"Young",62,1.113],[0.343,"Young",62,0.558],[0.353,"Full",59,9.72],[0.356,"Young",62,1.381],[0.365,"Full",61,8.457],[0.366,"Young",62,0.453],[0.374,"Full",61,8.139],[0.375,"Young",62,0.989],[0.384,"Full",62,8.401],[0.384,"Young",63,0.379],[0.393,"Full",62,8.817],[0.394,"Young",63,0.4],[0.403,"Full",63,8.897],[0.416,"Full",63,12.891],[0.416,"Young",63,0.294],[0.427,"Full",63,10.354],[0.438,"Full",63,10.956],[0.475,"Young",63,0.861],[0.484,"Full",63,9.275],[0.494,"Full",63,9.617],[0.495,"Young",63,0.498],[0.505,"Full",51,9.887]],"kinds":{"Young":22,"Remark":2,"Cleanup":1,"Full":14},"log":["[0.072s] GC(0) Pause Young (Normal) (G1 Evacuation Pause) 29M->17M(64M) 5.875ms","[0.083s] GC(1) Pause Young (Normal) (G1 Evacuation Pause) 30M->24M(64M) 5.398ms","[0.494s] GC(39) Pause Full (G1 Compaction Pause) 63M->63M(64M) 9.617ms","[0.495s] GC(40) Pause Young (Concurrent Start) (G1 Evacuation Pause) 63M->63M(64M) 0.498ms","[0.505s] GC(41) Pause Full (G1 Compaction Pause) 63M->51M(64M) 9.887ms"],"histo":[["[B",65194,34581256],["java.util.HashMap$Node",29164,933248],["java.lang.String",36952,886848],["[Ljava.util.HashMap$Node;",278,288000],["java.lang.Class",1840,225744]],"histoAt":28000,"dump_mb":67.0,"suspect":{"total":62.1,"root":"class Leaky","mb":60.8,"pct":97.9,"path":[["CACHE","java.util.HashMap"],["table","java.util.HashMap$Node[]"]],"acc":"java.util.HashMap$Node[]","children":[["java.util.HashMap$Node",40991]],"n":40991}},"cache|fixed":{"served":300000,"ms":129,"alloc_mb":625,"oom":null,"series":[[0.078,"Young",8,2.511],[0.099,"Young",8,2.467],[0.109,"Young",8,1.192],[0.118,"Young",8,0.911],[0.127,"Young",8,1.147],[0.134,"Young",8,1.628],[0.14,"Young",8,0.774],[0.146,"Young",8,0.756],[0.152,"Young",8,0.75],[0.156,"Young",8,0.718],[0.161,"Young",8,1.132],[0.164,"Young",8,0.679],[0.168,"Young",8,0.825],[0.172,"Young",8,0.691],[0.176,"Young",8,0.759],[0.179,"Young",8,0.725],[0.183,"Young",8,0.758],[0.187,"Young",8,0.759]],"kinds":{"Young":18},"log":["[0.078s] GC(0) Pause Young (Normal) (G1 Evacuation Pause) 29M->8M(64M) 2.511ms","[0.099s] GC(1) Pause Young (Normal) (G1 Evacuation Pause) 42M->8M(64M) 2.467ms","[0.179s] GC(15) Pause Young (Normal) (G1 Evacuation Pause) 43M->8M(64M) 0.725ms","[0.183s] GC(16) Pause Young (Normal) (G1 Evacuation Pause) 43M->8M(64M) 0.758ms","[0.187s] GC(17) Pause Young (Normal) (G1 Evacuation Pause) 43M->8M(64M) 0.759ms"],"histo":[],"histoAt":null},"listener|leak":{"served":28291,"ms":351,"alloc_mb":87,"oom":"java.lang.OutOfMemoryError: Java heap space","series":[[0.072,"Young",20,6.323],[0.079,"Young",28,3.549],[0.084,"Young",35,2.514],[0.271,"Full",36,8.136],[0.29,"Young",41,1.41],[0.293,"Young",46,1.248],[0.295,"Young",50,0.891],[0.295,"Remark",51,0.341],[0.297,"Young",54,1.079],[0.299,"Young",57,0.878],[0.299,"Cleanup",60,0.037],[0.3,"Young",61,0.635],[0.301,"Young",62,0.345],[0.307,"Full",57,6.136],[0.308,"Young",59,0.562],[0.309,"Young",63,0.595],[0.314,"Full",61,5.72],[0.315,"Young",62,0.241],[0.32,"Full",62,5.14],[0.321,"Young",63,0.261],[0.326,"Full",62,5.667],[0.327,"Young",63,0.297],[0.332,"Full",63,5.366],[0.343,"Full",63,10.705],[0.343,"Young",63,0.171],[0.35,"Full",63,7.133],[0.358,"Full",63,7.52],[0.392,"Young",63,0.28],[0.397,"Full",58,5.766]],"kinds":{"Young":17,"Full":10,"Remark":1,"Cleanup":1},"log":["[0.072s] GC(0) Pause Young (Normal) (G1 Evacuation Pause) 29M->20M(64M) 6.323ms","[0.079s] GC(1) Pause Young (Normal) (G1 Evacuation Pause) 32M->28M(64M) 3.549ms","[0.358s] GC(27) Pause Full (G1 Compaction Pause) 63M->63M(64M) 7.520ms","[0.392s] GC(28) Pause Young (Normal) (G1 Evacuation Pause) 63M->63M(64M) 0.280ms","[0.397s] GC(29) Pause Full (G1 Compaction Pause) 63M->58M(64M) 5.766ms"],"histo":[["[B",24198,35605376],["Leaky$$Lambda+0x00007fc000007a00",15000,240000],["Leaky$Session",15000,240000],["[Ljava.lang.Object;",1487,232224],["java.lang.Class",1844,226200]],"histoAt":15000,"dump_mb":65.9,"suspect":{"total":62.4,"root":"class Leaky","mb":61.1,"pct":97.9,"path":[["LISTENERS","java.util.Collections$SynchronizedRandomAccessList"],["list","java.util.ArrayList"],["elementData","java.lang.Object[]"]],"acc":"java.lang.Object[]","children":[["Leaky$$Lambda+0x00007fc000007a00",28291]],"n":28291}},"listener|fixed":{"served":300000,"ms":112,"alloc_mb":914,"oom":null,"series":[[0.067,"Young",6,1.152],[0.08,"Young",6,1.036],[0.087,"Young",6,0.614],[0.091,"Young",6,0.65],[0.095,"Young",6,0.666],[0.1,"Young",6,1.51],[0.105,"Young",6,0.759],[0.109,"Young",6,0.68],[0.113,"Young",6,0.809],[0.117,"Young",6,0.638],[0.121,"Young",6,0.717],[0.125,"Young",6,0.635],[0.129,"Young",6,0.804],[0.133,"Young",6,0.615],[0.137,"Young",6,0.543],[0.141,"Young",6,0.653],[0.143,"Young",6,0.337],[0.145,"Young",6,0.282],[0.148,"Young",6,0.916],[0.15,"Young",6,0.319],[0.152,"Young",6,0.325],[0.154,"Young",6,0.192],[0.157,"Young",6,0.327],[0.159,"Young",6,0.205],[0.161,"Young",6,0.301]],"kinds":{"Young":25},"log":["[0.067s] GC(0) Pause Young (Normal) (G1 Evacuation Pause) 29M->6M(64M) 1.152ms","[0.080s] GC(1) Pause Young (Normal) (G1 Evacuation Pause) 43M->6M(64M) 1.036ms","[0.157s] GC(22) Pause Young (Normal) (G1 Evacuation Pause) 43M->6M(64M) 0.327ms","[0.159s] GC(23) Pause Young (Normal) (G1 Evacuation Pause) 43M->6M(64M) 0.205ms","[0.161s] GC(24) Pause Young (Normal) (G1 Evacuation Pause) 43M->6M(64M) 0.301ms"],"histo":[],"histoAt":null},"threadlocal|leak":{"served":56883,"ms":1023,"alloc_mb":67,"oom":"java.lang.OutOfMemoryError: Java heap space","series":[[0.18,"Young",15,4.289],[0.432,"Full",21,6.737],[0.512,"Young",27,2.717],[0.575,"Young",33,2.845],[0.58,"Remark",34,1.354],[0.581,"Cleanup",34,0.048],[0.621,"Young",37,2.048],[0.66,"Young",41,1.649],[0.695,"Young",45,1.739],[0.7,"Remark",45,0.682],[0.701,"Cleanup",46,0.041],[0.729,"Young",48,0.919],[0.752,"Young",50,2.073],[0.776,"Young",52,1.016],[0.779,"Remark",53,0.514],[0.78,"Cleanup",53,0.042],[0.796,"Young",54,0.919],[0.811,"Young",55,0.948],[0.825,"Young",56,0.757],[0.828,"Remark",57,0.826],[0.829,"Cleanup",57,0.04],[0.834,"Young",57,0.557],[0.844,"Young",58,0.58],[0.854,"Young",59,0.48],[0.856,"Remark",59,0.277],[0.858,"Cleanup",59,0.043],[0.864,"Young",60,0.656],[0.873,"Young",62,0.509],[0.879,"Young",63,1.512],[0.884,"Full",60,4.343],[0.893,"Young",62,0.567],[0.896,"Full",61,3.25],[0.901,"Young",62,0.466],[0.905,"Full",61,3.653],[0.914,"Young",63,0.524],[0.917,"Full",62,3.255],[0.92,"Young",63,0.33],[0.924,"Full",62,3.793],[0.928,"Young",63,0.703],[0.932,"Full",62,3.993],[0.941,"Full",62,8.535],[0.945,"Young",63,0.398],[0.949,"Full",63,3.944],[0.957,"Full",63,7.104],[0.957,"Young",63,0.212],[0.96,"Full",63,3.177],[0.965,"Full",63,5.29],[1.004,"Young",63,0.345],[1.007,"Full",63,2.831],[1.015,"Full",63,7.599],[1.015,"Young",63,0.28],[1.018,"Full",63,3.387],[1.025,"Full",63,6.696],[1.026,"Young",63,0.296],[1.029,"Full",63,3.36],[1.037,"Full",63,7.594],[1.037,"Young",63,0.241],[1.04,"Full",63,3.014],[1.045,"Full",63,5.527],[1.046,"Young",63,0.315],[1.049,"Full",63,3.39],[1.056,"Full",63,6.445],[1.056,"Young",63,0.258],[1.06,"Full",63,3.451],[1.065,"Full",63,5.77],[1.066,"Young",63,0.309],[1.069,"Full",58,2.825]],"kinds":{"Young":32,"Full":25,"Remark":5,"Cleanup":5},"log":["[0.180s] GC(0) Pause Young (Normal) (G1 Evacuation Pause) 29M->15M(64M) 4.289ms","[0.432s] GC(1) Pause Full (Heap Inspection Initiated GC) 30M->21M(64M) 6.737ms","[1.065s] GC(66) Pause Full (G1 Compaction Pause) 63M->63M(64M) 5.770ms","[1.066s] GC(67) Pause Young (Normal) (G1 Evacuation Pause) 63M->63M(64M) 0.309ms","[1.069s] GC(68) Pause Full (G1 Compaction Pause) 63M->58M(64M) 2.825ms"],"histo":[["[B",24214,20245960],["java.lang.Class",1847,226576],["java.lang.String",8972,215328],["[Ljava.lang.Object;",1496,214800],["java.util.concurrent.ConcurrentHashMap$Node",1584,50688]],"histoAt":15000,"dump_mb":65.3,"suspect":{"total":62.1,"root":"thread #9 java.lang.Thread","mb":14.2,"pct":22.9,"path":[["threadLocals","java.lang.ThreadLocal$ThreadLocalMap"],["table","java.lang.ThreadLocal$ThreadLocalMap$Entry[]"],["[0]","java.lang.ThreadLocal$ThreadLocalMap$Entry"],["value","java.util.ArrayList"],["elementData","java.lang.Object[]"]],"acc":"java.lang.Object[]","children":[["byte[]",14224]],"n":14224}},"threadlocal|fixed":{"served":300000,"ms":3016,"alloc_mb":348,"oom":null,"series":[[0.194,"Young",6,4.383],[0.369,"Young",6,0.683],[0.533,"Young",6,0.817],[0.695,"Young",6,1.176],[0.855,"Young",6,0.678],[1.019,"Young",6,1.054],[1.168,"Young",6,0.663],[1.318,"Young",6,0.597],[1.467,"Young",6,0.639],[1.614,"Young",6,0.703],[1.767,"Young",6,1.232],[1.92,"Young",6,1.2],[2.069,"Young",6,0.642],[2.223,"Young",6,0.757],[2.384,"Young",6,1.008],[2.54,"Young",6,1.51],[2.684,"Young",6,0.566],[2.844,"Young",6,0.489],[3.013,"Young",6,0.716]],"kinds":{"Young":19},"log":["[0.194s] GC(0) Pause Young (Normal) (G1 Evacuation Pause) 29M->6M(64M) 4.383ms","[0.369s] GC(1) Pause Young (Normal) (G1 Evacuation Pause) 43M->6M(64M) 0.683ms","[2.684s] GC(16) Pause Young (Normal) (G1 Evacuation Pause) 43M->6M(64M) 0.566ms","[2.844s] GC(17) Pause Young (Normal) (G1 Evacuation Pause) 43M->6M(64M) 0.489ms","[3.013s] GC(18) Pause Young (Normal) (G1 Evacuation Pause) 43M->6M(64M) 0.716ms"],"histo":[],"histoAt":null},"churn|leak":{"served":300000,"ms":436,"alloc_mb":6601,"oom":null,"series":[[0.081,"Young",6,1.423],[0.095,"Young",6,0.929],[0.103,"Young",6,0.797],[0.108,"Young",6,0.736],[0.112,"Young",6,0.732],[0.115,"Young",6,0.655],[0.118,"Young",6,0.747],[0.121,"Young",6,0.692],[0.125,"Young",6,1.458],[0.128,"Young",6,0.728],[0.131,"Young",6,0.629],[0.134,"Young",6,0.664],[0.138,"Young",6,0.737],[0.141,"Young",6,0.761],[0.144,"Young",6,0.966],[0.147,"Young",6,0.724],[0.149,"Young",6,0.478],[0.152,"Young",6,0.357],[0.154,"Young",6,0.248],[0.156,"Young",6,0.251],[0.158,"Young",6,0.203],[0.16,"Young",6,0.191],[0.162,"Young",6,0.201],[0.164,"Young",6,0.209],[0.166,"Young",6,0.179],[0.168,"Young",6,0.189],[0.17,"Young",6,0.173],[0.172,"Young",6,0.195],[0.174,"Young",6,0.175],[0.176,"Young",6,0.234],[0.178,"Young",6,0.202],[0.18,"Young",6,0.208],[0.182,"Young",6,0.219],[0.184,"Young",6,0.198],[0.186,"Young",6,0.176],[0.188,"Young",6,0.185],[0.19,"Young",6,0.181],[0.192,"Young",6,0.245],[0.194,"Young",6,0.183],[0.196,"Young",6,0.216],[0.198,"Young",6,0.208],[0.2,"Young",6,0.22],[0.202,"Young",6,0.232],[0.204,"Young",6,0.192],[0.206,"Young",6,0.187],[0.208,"Young",6,0.2],[0.21,"Young",6,0.204],[0.212,"Young",6,0.225],[0.214,"Young",6,0.218],[0.216,"Young",6,0.228],[0.218,"Young",6,0.198],[0.22,"Young",6,0.191],[0.223,"Young",6,0.214],[0.225,"Young",6,0.204],[0.227,"Young",6,0.19],[0.229,"Young",6,0.23],[0.231,"Young",6,0.206],[0.233,"Young",6,0.222],[0.235,"Young",6,0.185],[0.237,"Young",6,0.191],[0.239,"Young",6,0.197],[0.241,"Young",6,0.183],[0.243,"Young",6,0.212],[0.245,"Young",6,0.193],[0.247,"Young",6,0.217],[0.249,"Young",6,0.195],[0.251,"Young",6,0.183],[0.253,"Young",6,0.214],[0.255,"Young",6,0.181],[0.257,"Young",6,0.182],[0.259,"Young",6,0.173],[0.261,"Young",6,0.211],[0.263,"Young",6,0.197],[0.265,"Young",6,0.226],[0.267,"Young",6,0.181],[0.269,"Young",6,0.322],[0.271,"Young",6,0.198],[0.273,"Young",6,0.206],[0.275,"Young",6,0.236],[0.277,"Young",6,0.202],[0.279,"Young",6,0.206],[0.281,"Young",6,0.196],[0.284,"Young",6,0.197],[0.286,"Young",6,0.2],[0.288,"Young",6,0.216],[0.289,"Young",6,0.206],[0.291,"Young",6,0.21],[0.294,"Young",6,0.228],[0.296,"Young",6,0.219],[0.298,"Young",6,0.187],[0.3,"Young",6,0.208],[0.302,"Young",6,0.23],[0.304,"Young",6,0.218],[0.307,"Young",6,0.654],[0.309,"Young",6,0.605],[0.312,"Young",6,0.202],[0.314,"Young",6,0.351],[0.317,"Young",6,0.548],[0.319,"Young",6,0.299],[0.321,"Young",6,0.303],[0.324,"Young",6,0.682],[0.326,"Young",6,0.341],[0.329,"Young",6,0.225],[0.331,"Young",6,0.301],[0.333,"Young",6,0.248],[0.335,"Young",6,0.184],[0.338,"Young",6,0.23],[0.34,"Young",6,0.232],[0.342,"Young",6,0.198],[0.344,"Young",6,0.197],[0.346,"Young",6,0.309],[0.348,"Young",6,0.233],[0.351,"Young",6,0.233],[0.353,"Young",6,0.676],[0.355,"Young",6,0.196],[0.357,"Young",6,0.338],[0.359,"Young",6,0.185],[0.361,"Young",6,0.309],[0.365,"Young",6,1.002],[0.367,"Young",6,0.306],[0.369,"Young",6,0.349],[0.371,"Young",6,0.192],[0.374,"Young",6,0.375],[0.377,"Young",6,0.896],[0.379,"Young",6,0.385],[0.381,"Young",6,0.314],[0.383,"Young",6,0.191],[0.385,"Young",6,0.206],[0.387,"Young",6,0.166],[0.389,"Young",6,0.577],[0.392,"Young",6,0.191],[0.394,"Young",6,0.223],[0.396,"Young",6,0.304],[0.398,"Young",6,0.164],[0.4,"Young",6,0.543],[0.402,"Young",6,0.18],[0.405,"Young",6,0.312],[0.407,"Young",6,0.172],[0.409,"Young",6,0.299],[0.411,"Young",6,0.179],[0.413,"Young",6,0.347],[0.415,"Young",6,0.184],[0.418,"Young",6,0.332],[0.42,"Young",6,0.328],[0.422,"Young",6,0.217],[0.425,"Young",6,0.4],[0.426,"Young",6,0.174],[0.429,"Young",6,0.318],[0.431,"Young",6,0.182],[0.433,"Young",6,0.19],[0.435,"Young",6,0.183],[0.437,"Young",6,0.307],[0.439,"Young",6,0.181],[0.441,"Young",6,0.357],[0.443,"Young",6,0.187],[0.445,"Young",6,0.328],[0.447,"Young",6,0.17],[0.449,"Young",6,0.282],[0.451,"Young",6,0.165],[0.453,"Young",6,0.207],[0.455,"Young",6,0.172],[0.457,"Young",6,0.281],[0.459,"Young",6,0.172],[0.461,"Young",6,0.393],[0.463,"Young",6,0.19],[0.465,"Young",6,0.283],[0.467,"Young",6,0.196],[0.469,"Young",6,0.279],[0.471,"Young",6,0.186],[0.473,"Young",6,0.308],[0.475,"Young",6,0.198],[0.477,"Young",6,0.182],[0.48,"Young",6,0.202],[0.481,"Young",6,0.184],[0.483,"Young",6,0.182],[0.485,"Young",6,0.177],[0.487,"Young",6,0.187],[0.489,"Young",6,0.29],[0.491,"Young",6,0.171]],"kinds":{"Young":179},"log":["[0.081s] GC(0) Pause Young (Normal) (G1 Evacuation Pause) 29M->6M(64M) 1.423ms","[0.095s] GC(1) Pause Young (Normal) (G1 Evacuation Pause) 43M->6M(64M) 0.929ms","[0.487s] GC(176) Pause Young (Normal) (G1 Evacuation Pause) 43M->6M(64M) 0.187ms","[0.489s] GC(177) Pause Young (Normal) (G1 Evacuation Pause) 43M->6M(64M) 0.290ms","[0.491s] GC(178) Pause Young (Normal) (G1 Evacuation Pause) 43M->6M(64M) 0.171ms"],"histo":[],"histoAt":-1},"churn|fixed":{"served":300000,"ms":83,"alloc_mb":308,"oom":null,"series":[[0.076,"Young",6,2.49],[0.093,"Young",6,0.765],[0.101,"Young",6,0.709],[0.107,"Young",6,1.022],[0.113,"Young",6,0.762],[0.119,"Young",6,1.381],[0.125,"Young",6,0.809],[0.132,"Young",6,0.767]],"kinds":{"Young":8},"log":["[0.076s] GC(0) Pause Young (Normal) (G1 Evacuation Pause) 29M->6M(64M) 2.490ms","[0.093s] GC(1) Pause Young (Normal) (G1 Evacuation Pause) 43M->6M(64M) 0.765ms","[0.119s] GC(5) Pause Young (Normal) (G1 Evacuation Pause) 43M->6M(64M) 1.381ms","[0.125s] GC(6) Pause Young (Normal) (G1 Evacuation Pause) 43M->6M(64M) 0.809ms","[0.132s] GC(7) Pause Young (Normal) (G1 Evacuation Pause) 43M->6M(64M) 0.767ms"],"histo":[],"histoAt":null}};
  var MODES = [
    { k: "audit", label: "Static list", what: "Every request is appended to a `static List` \"for auditing\" and never removed.",
      leak: "static final List<Request> AUDIT = new ArrayList<>();\n...\nAUDIT.add(request);            // grows forever", fix: "log.info(\"{} {}\", r.id(), r.payload().length); // keep a summary, not the object\n// or bounded: an EvictingQueue / ring buffer of the last N" },
    { k: "cache", label: "Unbounded cache", what: "A `HashMap` used as a cache, keyed by request id, with no size limit or expiry.",
      leak: "static final Map<String, byte[]> CACHE = new HashMap<>();\nCACHE.put(id, value);         // unique keys, never evicted", fix: "Map<String, byte[]> LRU = new LinkedHashMap<>(16, 0.75f, true) {\n  protected boolean removeEldestEntry(Map.Entry<String, byte[]> e) { return size() > 2000; }\n};   // in production: Caffeine.newBuilder().maximumSize(..).expireAfterWrite(..)" },
    { k: "listener", label: "Forgotten listener", what: "Each request registers a listener lambda that captures its 2 KB session, and never unregisters.",
      leak: "Session s = new Session();\nListener l = e -> use(s);      // captures the session\nLISTENERS.add(l);              // no remove", fix: "LISTENERS.add(l);\ntry { handle(); }\nfinally { LISTENERS.remove(l); }   // or weak listeners / scoped subscriptions" },
    { k: "threadlocal", label: "ThreadLocal in a pool", what: "A 4-thread pool; each task adds to a `ThreadLocal` list that is never cleared with `remove()`, so pooled threads keep everything.",
      leak: "static final ThreadLocal<List<byte[]>> CTX = ThreadLocal.withInitial(ArrayList::new);\npool.submit(() -> CTX.get().add(new byte[1024]));", fix: "pool.submit(() -> {\n  try { CTX.get().add(new byte[1024]); /* work */ }\n  finally { CTX.remove(); }     // threads are reused!\n});" },
    { k: "churn", label: "No leak: churn", what: "Not a leak: each request builds a 4 KB string from 20 temporary `String`s. Lots of garbage, flat live set.",
      leak: "StringBuilder sb = new StringBuilder();\nfor (int i = 0; i < 20; i++) sb.append(new String(new byte[200]));", fix: "SB.setLength(0);                       // reuse one builder\nfor (int i = 0; i < 20; i++) SB.append(CHUNK);   // no temporary Strings" }
  ];
  var STEPS = ["1. Symptom: GC log", "2. Histogram", "3. Heap dump", "4. Fix + verify"];
  function chart(a, b) {
    var W = 640, Hh = 170;
    function x(t, r) { var end = r.series[r.series.length - 1][0]; return 40 + (W - 50) * t / end; } function y(mb) { return 10 + (Hh - 30) * (1 - mb / 64); }
    function line(r, col) {
      var pts = r.series.map(function (p) { return x(p[0], r).toFixed(1) + "," + y(p[2]).toFixed(1); }).join(" ");
      var dots = r.series.filter(function (p) { return p[1] === "Full"; }).map(function (p) { return "<circle cx='" + x(p[0], r).toFixed(1) + "' cy='" + y(p[2]).toFixed(1) + "' r='3' fill='#dc2626'/>"; }).join("");
      return "<polyline fill='none' stroke='" + col + "' stroke-width='2' points='" + pts + "'/>" + dots;
    }
    return "<svg viewBox='0 0 " + W + " " + Hh + "' style='width:100%;max-width:" + W + "px;background:#fafafa;border:1px solid #e5e7eb;border-radius:6px'>" +
      "<line x1='40' x2='" + (W - 10) + "' y1='" + y(64) + "' y2='" + y(64) + "' stroke='#94a3b8' stroke-dasharray='4'/><text x='44' y='" + (y(64) + 12) + "' font-size='11' fill='#64748b'>-Xmx64m</text>" +
      "<text x='4' y='" + (y(32) + 4) + "' font-size='11' fill='#64748b'>32 MB</text><text x='4' y='" + (y(0) + 4) + "' font-size='11' fill='#64748b'>0</text>" +
      "<text x='" + (W - 10) + "' y='" + (Hh - 4) + "' font-size='11' text-anchor='end' fill='#64748b'>end of run</text>" +
      line(b, "#16a34a") + line(a, "#dc2626") + "</svg><div style='font-size:12px;color:#64748b'>Heap used <b>after</b> each GC (from -Xlog:gc). x axis: progress through each run (leaky " + a.series[a.series.length - 1][0].toFixed(2) + " s, fixed " + b.series[b.series.length - 1][0].toFixed(2) + " s). Red = leaky version (dots = Full GCs), green = fixed version.</div>";
  }
  function j31Widget(el, ctx) {
    var s = ctx.state; if (!s.m) s.m = "audit"; if (s.st == null) s.st = 0;
    el.innerHTML = "<div class='btnrow' data-r='ms'>" + MODES.map(function (m) { return "<button type='button' class='btn' data-m='" + m.k + "'>" + m.label + "</button>"; }).join("") + "</div>" +
      "<div class='btnrow' data-r='ss' style='margin-top:6px'>" + STEPS.map(function (t, i) { return "<button type='button' class='btn' data-s='" + i + "'>" + t.replace(/^\d\. /, "Step " + (i + 1) + ": ") + "</button>"; }).join("") + "</div>" +
      "<div class='result' data-r='what' style='margin-top:8px'></div><div data-r='body'></div>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    function card(label, val, bad) { return "<div style='flex:1;min-width:120px;border:1px solid #e5e7eb;border-radius:8px;padding:8px'><div style='font-size:12px;color:#64748b'>" + label + "</div><div style='font-size:18px;font-weight:700;color:" + (bad ? "#b91c1c" : "#111827") + "'>" + val + "</div></div>"; }
    function pre(t) { return "<pre class='code' style='white-space:pre-wrap'>" + ctx.esc(t) + "</pre>"; }
    function draw() {
      var m = MODES.filter(function (x) { return x.k === s.m; })[0], L = REC[s.m + "|leak"], F = REC[s.m + "|fixed"], leak = !!L.oom;
      q("ms").querySelectorAll("button").forEach(function (b) { b.classList.toggle("primary", b.dataset.m === s.m); });
      q("ss").querySelectorAll("button").forEach(function (b) { b.classList.toggle("primary", +b.dataset.s === s.st); });
      q("what").innerHTML = ctx.md(m.what);
      var h = "";
      if (s.st === 0) {
        h = "<div style='display:flex;gap:10px;flex-wrap:wrap;margin:8px 0'>" + card("requests served", L.served.toLocaleString("en-US") + " / 300,000", leak) + card("young GCs", (L.kinds.Young || 0) + "", false) + card("full GCs", (L.kinds.Full || 0) + "", (L.kinds.Full || 0) > 0) + card("allocated", L.alloc_mb + " MB", false) + "</div>" +
          chart(L, F) + pre("$ java -Xmx64m -Xlog:gc -XX:+HeapDumpOnOutOfMemoryError Leaky " + s.m + "\n" + L.log.join("\n") + (L.oom ? "\n" + L.oom : "")) +
          "<div class='result'>" + ctx.md(leak ? "**Leak signature:** the heap *after* GC keeps climbing, young GCs free less and less, then back-to-back **Full GCs** that free almost nothing (`63M->63M`) and finally `OutOfMemoryError`. Bigger `-Xmx` would only delay this." : "**Not a leak:** after every GC the heap drops back to the same ~" + L.series[L.series.length - 1][2] + " MB. It's **churn**: " + L.alloc_mb + " MB allocated for 300k requests means " + L.series.length + " young GCs. Tuning won't help much; allocating less will.") + "</div>";
      } else if (s.st === 1) {
        h = L.histo.length ? pre("$ jcmd <pid> GC.class_histogram     # taken at request " + L.histoAt.toLocaleString("en-US") + "\n num   #instances      #bytes  class name\n" + L.histo.map(function (r, i) { return ("   " + (i + 1) + ":").slice(-5) + ("            " + r[1]).slice(-12) + ("            " + r[2]).slice(-12) + "  " + r[0]; }).join("\n")) +
          "<div class='result'>" + ctx.md("The histogram counts objects **by class** (it forces a full GC first, see *Heap Inspection Initiated GC* in logs). " + ({ audit: "29,000 `Leaky$Request` objects at request 29,000: one per request, none freed. That's the clue; `[B` (byte[]) is just their payload.", cache: "Only `byte[]` and `HashMap$Node` stand out: ~29k nodes means a map with one entry per request. A histogram tells you *what*, not *who holds it*.", listener: "Exactly 15,000 lambdas and 15,000 `Session`s at request 15,000: something keeps one listener per request.", threadlocal: "Just ~20 MB of `byte[]` and nothing app-specific: the histogram can't show the owner. You need the heap dump's paths to GC roots." }[s.m] || "")) + "</div>"
          : "<div class='result'>" + ctx.md("No histogram needed: the GC log already shows a flat live set. For churn use an **allocation profiler** (JFR `jdk.ObjectAllocationSample`, async-profiler `-e alloc`) to find who allocates.") + "</div>";
      } else if (s.st === 2) {
        var x = L.suspect;
        h = x ? pre("java.lang.OutOfMemoryError: Java heap space\nDumping heap to " + s.m + ".hprof ...   (" + L.dump_mb + " MB file)") +
          "<div style='display:flex;gap:10px;flex-wrap:wrap;margin:8px 0'>" + card("heap in dump", x.total + " MB", false) + card("retained by top suspect", x.mb + " MB (" + x.pct + "%)", true) + card("objects in accumulation point", x.n.toLocaleString("en-US"), true) + "</div>" +
          pre("Shortest path from GC root (dominator tree):\n" + x.root + "\n" + x.path.map(function (p, i) { return "  ".repeat(i + 1) + "└─ ." + p[0] + " → " + p[1]; }).join("\n") + "\n" + "  ".repeat(x.path.length + 1) + "└─ " + x.n.toLocaleString("en-US") + " × " + x.children[0][0]) +
          "<div class='result'>" + ctx.md("This is what Eclipse MAT's *Leak Suspects* report shows: the object that **retains** most of the heap and the reference chain keeping it alive. " + (s.m === "threadlocal" ? "Here it's a **pool thread's** `threadLocals` map (one of four: the others hold the same ~14 MB each)." : "The chain ends in a `static` field of `Leaky`, so it lives as long as the class.")) + "</div>"
          : "<div class='result'>" + ctx.md("No OOM, so no dump. A dump of a churning app shows only a small live set; the garbage is already gone.") + "</div>";
      } else {
        h = "<div style='display:flex;gap:10px;flex-wrap:wrap'><div style='flex:1;min-width:260px'><b>Before</b>" + pre(m.leak) + "</div><div style='flex:1;min-width:260px'><b>After</b>" + pre(m.fix) + "</div></div>" +
          "<div style='display:flex;gap:10px;flex-wrap:wrap;margin:8px 0'>" + card("requests served", F.served.toLocaleString("en-US"), false) + card("full GCs", (F.kinds.Full || 0) + "", false) + card("young GCs", (F.kinds.Young || 0) + " (was " + (L.kinds.Young || 0) + ")", false) + card("run time", F.ms + " ms (was " + L.ms + ")", false) + card("allocated", F.alloc_mb + " MB (was " + L.alloc_mb + ")", false) + "</div>" + chart(L, F) +
          "<div class='result'>" + ctx.md(leak ? "Verify the fix the same way you found it: the heap after GC stays flat and there are no Full GCs." : "Allocating ~20× less cut young GCs from " + L.kinds.Young + " to " + F.kinds.Young + " and the run time from " + L.ms + " to " + F.ms + " ms, with no GC flags changed.") + "</div>";
      }
      q("body").innerHTML = h;
    }
    q("ms").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; s.m = b.dataset.m; ctx.save(); draw(); });
    q("ss").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; s.st = +b.dataset.s; ctx.save(); draw(); });
    draw();
  }

  var SLIDES = [
    { title: "Leak, too small, or just churn?",
      text: "Memory problems come in three shapes and the **GC log** tells them apart. A **leak**: the heap used *after* each GC keeps rising until back-to-back Full GCs free nothing and you get `OutOfMemoryError`. **Undersized heap**: the live set is stable but too close to `-Xmx`, so GCs run constantly and may still fail at peaks. **Churn**: the live set is small and flat but the allocation rate is huge, so young GCs run hundreds of times. Only the second one is fixed by GC flags. Leaks need a heap dump; churn needs an allocation profile. Watch *heap after GC*, not heap used, which always looks like a saw-tooth.",
      table: [["Shape", "Heap after GC", "GC log shows", "Fix"],
        ["Leak", "rises steadily", "more Full GCs, then OOM", "find the holder in a heap dump"],
        ["Heap too small", "flat but near -Xmx", "frequent GCs, Full GCs at peaks", "raise -Xmx / reduce live data"],
        ["Churn", "flat and low", "very many young GCs", "allocate less (profile allocations)"]],
      code: `MemoryPoolMXBean old = ManagementFactory.getMemoryPoolMXBeans().stream().filter(p -> p.getName().contains("Old Gen")).findFirst().orElseThrow();
List<byte[]> leak = new ArrayList<>();
for (int round = 1; round <= 4; round++) {
    for (int i = 0; i < 20_000; i++) { byte[] tmp = new byte[1024]; if (i % 4 == 0) leak.add(tmp); }   // 25% kept
    System.gc();
    System.out.printf("round %d: old gen after GC = %d MB%n", round, old.getCollectionUsage().getUsed() >> 20);
}`,
      analogy: "A bathtub: a leak is a plug someone stuck in (the level after draining keeps rising), an undersized heap is a tub that's simply too small, churn is a tap running at full blast into an open drain." },
    { title: "Sizing the heap (and containers)",
      text: "`-Xmx` caps the heap; `-Xms` is the starting size (setting them equal avoids resize pauses and is common for servers). Without flags the JVM takes **25% of available RAM** as max heap, and since JDK 10 it reads the **container's** memory and CPU limits, not the host's. In Kubernetes prefer `-XX:MaxRAMPercentage=70..75` so the heap follows the pod limit, leaving room for **non-heap** memory: Metaspace, thread stacks, code cache, direct buffers and GC structures. A pod killed with **OOMKilled** (exit 137) is the *process* exceeding the limit; a Java `OutOfMemoryError` is the *heap*. Different problems.",
      code: `class ShowHeap { public static void main(String[] a) { System.out.println(Runtime.getRuntime().maxMemory() / 1_048_576 + " MB max heap, " + Runtime.getRuntime().availableProcessors() + " CPUs"); } }
String java = ProcessHandle.current().info().command().orElse("java");
String cp = ShowHeap.class.getProtectionDomain().getCodeSource().getLocation().getPath();
long ram = ((com.sun.management.OperatingSystemMXBean) ManagementFactory.getOperatingSystemMXBean()).getTotalMemorySize() >> 20;
System.out.println("machine RAM: " + ram + " MB");
for (List<String> flags : List.of(List.<String>of(), List.of("-XX:MaxRAMPercentage=75"), List.of("-Xmx256m"), List.of("-XX:ActiveProcessorCount=2"))) {
    List<String> cmd = new ArrayList<>(List.of(java)); cmd.addAll(flags); cmd.addAll(List.of("-cp", cp, "ShowHeap"));
    String out = new String(new ProcessBuilder(cmd).start().getInputStream().readAllBytes()).trim();
    System.out.printf("%-28s -> %s%n", flags.isEmpty() ? "(defaults)" : String.join(" ", flags), out);
}`,
      analogy: "-Xmx is the size of the suitcase; the container limit is the airline's weight limit for suitcase plus carry-ons. Pack the suitcase to 75% of the allowance or the airline (the kernel) refuses you at the gate." },
    { title: "The few knobs that matter",
      text: "Modern collectors are **ergonomic**: they size generations themselves. With G1, set a **pause goal** (`-XX:MaxGCPauseMillis`, default 200 ms) and let it adapt young size; don't also fix `-Xmn`, which disables that adaptation. Other knobs are for specific log evidence: `InitiatingHeapOccupancyPercent` if marking starts too late (to-space exhausted, Full GCs), `G1HeapRegionSize` for many humongous allocations, `ParallelGCThreads`/`ConcGCThreads` in CPU-limited containers. Change **one flag at a time**, under realistic load, and compare logs. Most GC-tuning wins actually come from heap size and from allocating less.",
      code: `class Flags { public static void main(String[] a) {} }
String java = ProcessHandle.current().info().command().orElse("java");
String cp = Flags.class.getProtectionDomain().getCodeSource().getLocation().getPath();
Process p = new ProcessBuilder(java, "-XX:+UseG1GC", "-Xmx1g", "-XX:+PrintFlagsFinal", "-cp", cp, "Flags").start();
Set<String> wanted = Set.of("MaxGCPauseMillis", "G1HeapRegionSize", "InitiatingHeapOccupancyPercent", "ParallelGCThreads", "ConcGCThreads", "MaxTenuringThreshold", "G1NewSizePercent", "G1MaxNewSizePercent");
new String(p.getInputStream().readAllBytes()).lines().map(String::trim).filter(l -> wanted.contains(l.split("\\\\s+")[1]))
    .forEach(l -> { String[] f = l.split("\\\\s+"); System.out.printf("%-32s = %s%n", f[1], f[3]); });`,
      analogy: "Tuning G1 is like setting cruise control: you pick the speed (the pause goal) and let the car handle the throttle. Pressing the pedal yourself (fixing -Xmn) just fights the system." },
    { title: "Allocation rate: tune or fix the code?",
      text: "Every young GC is triggered by eden filling up, so **GC frequency ≈ allocation rate ÷ eden size**. An app allocating 1 GB/s with 200 MB of eden collects 5 times a second. You can enlarge eden (tuning) or allocate less (fixing). Cutting allocation is usually the bigger, safer win: avoid temporary objects in hot loops, boxing in collections, `String` concatenation in log calls that end up disabled, streams in tight inner loops, and re-reading large payloads. Measure first: JFR (`jdk.ObjectAllocationSample`), async-profiler's alloc mode, or `ThreadMXBean.getThreadAllocatedBytes` in a micro-test like this one.",
      code: `var tmx = (com.sun.management.ThreadMXBean) ManagementFactory.getThreadMXBean();
long me = Thread.currentThread().threadId();
List<Integer> ids = IntStream.range(0, 1000).boxed().toList();
Function<Runnable, Long> bytes = r -> { long b0 = tmx.getThreadAllocatedBytes(me); r.run(); return tmx.getThreadAllocatedBytes(me) - b0; };
long concat = bytes.apply(() -> { String s = ""; for (int id : ids) s += id + ","; });
long builder = bytes.apply(() -> { StringBuilder sb = new StringBuilder(); for (int id : ids) sb.append(id).append(','); sb.toString(); });
long boxed = bytes.apply(() -> { List<Long> l = new ArrayList<>(); for (long i = 0; i < 100_000; i++) l.add(i * 1000); });
long prim = bytes.apply(() -> { long[] l = new long[100_000]; for (int i = 0; i < l.length; i++) l[i] = i * 1000L; });
System.out.printf("String += in a loop : %,10d bytes%nStringBuilder       : %,10d bytes%n", concat, builder);
System.out.printf("List<Long> 100k     : %,10d bytes%nlong[] 100k         : %,10d bytes%n", boxed, prim);`,
      analogy: "If your kitchen bin fills every ten minutes, you can buy a bigger bin (tuning) or stop unwrapping every biscuit individually (fixing the code)." },
    { title: "Leak #1: static collections and unbounded caches",
      text: "The most common leak is a collection reachable from a `static` field (or a singleton bean, which is effectively static) that only ever grows: an audit list, a map from request id to something, a 'temporary' cache with no eviction, a `String.intern()`-style registry. Every cache needs a **bound** (maximum size) and usually an **expiry**; use Caffeine (or Spring's cache abstraction backed by it) instead of a bare `HashMap`. Also watch maps keyed by objects with broken `equals`/`hashCode`: every put adds a new entry, because no key ever matches.",
      code: `class Lru<K, V> extends LinkedHashMap<K, V> {
    private final int max;
    Lru(int max) { super(16, 0.75f, true); this.max = max; }       // access order = LRU
    @Override protected boolean removeEldestEntry(Map.Entry<K, V> e) { return size() > max; }
}
record BadKey(String id) { public boolean equals(Object o) { return false; } }   // broken equals
Map<String, byte[]> unbounded = new HashMap<>();
Map<String, byte[]> bounded = new Lru<>(1000);
Map<BadKey, String> broken = new HashMap<>();
for (int i = 0; i < 50_000; i++) { unbounded.put("req-" + i, new byte[100]); bounded.put("req-" + i, new byte[100]); }
for (int i = 0; i < 1000; i++) broken.put(new BadKey("same"), "x");
System.out.println("unbounded: " + unbounded.size() + " entries, bounded LRU: " + bounded.size() + " entries");
System.out.println("map with broken equals, same key put 1000 times: " + broken.size() + " entries");`,
      analogy: "An unbounded cache is a fridge where nobody ever throws anything away: every item made sense when it went in." },
    { title: "Leak #2: listeners, callbacks and inner classes",
      text: "Registering a listener stores a reference to it in the event source; if the source lives longer than the listener (an application-wide event bus, a static `Timer`, a long-lived UI model), the listener and **everything it captures** stay alive until someone unregisters it. Lambdas capture the variables they use; **non-static inner and anonymous classes** capture the enclosing instance (`this$0`) as soon as they touch any of its fields or methods (since JDK 18 javac drops the reference when it is unused, but older bytecode and most real listeners do use it). Unregister in `finally` or on close, return a subscription handle that implements `AutoCloseable`, and make nested classes `static` when they don't need the outer object.",
      m: M(["flowchart LR",
        "  BUS[\"static EventBus<br/>listeners list\"]:::s1 --> L[\"anonymous Listener\"]:::s3",
        "  L -->|this$0| P[\"ReportPage<br/>200 MB of rows\"]:::s3",
        "  classDef s1 fill:#dbeafe,stroke:#2563eb", "  classDef s3 fill:#ffebee,stroke:#c62828"]),
      code: `class Bus { static final List<Runnable> LISTENERS = new ArrayList<>(); }
class ReportPage {
    final byte[] rows = new byte[20_000_000];
    void open() { Bus.LISTENERS.add(new Runnable() { public void run() { System.out.println("refresh " + rows.length); } }); }  // uses rows: captures this
    static Runnable refresher() { return () -> System.out.println("refresh"); }                                      // static: captures nothing
}
ReportPage page = new ReportPage(); page.open();
var ref = new java.lang.ref.WeakReference<>(page);
page = null;
for (int i = 0; i < 5; i++) { System.gc(); Thread.sleep(20); }
System.out.println("page collected while the anonymous listener is registered? " + (ref.get() == null));
Bus.LISTENERS.clear();
for (int i = 0; i < 10 && ref.get() != null; i++) { System.gc(); Thread.sleep(20); }
System.out.println("after unregistering:                                       " + (ref.get() == null));`,
      analogy: "Signing up for a newsletter with your home address: the publisher keeps your address long after you've moved, and keeps sending to whoever lives there." },
    { title: "Leak #3: ThreadLocal in thread pools",
      text: "A `ThreadLocal` value lives as long as **the thread**. In a pool (Tomcat request threads, executor services) threads live for the whole application, so a value that is set and never removed is kept forever, and worse, the **next task** on that thread sees the previous task's data (a user context bleeding into another request). Always pair `set` with `remove()` in `finally`, or use frameworks that do it for you (Spring's `RequestContextHolder`, MDC cleanup filters). With virtual threads (J27) there is one thread per task, so values die with the task, but millions of threads each holding a big value is its own memory problem; prefer `ScopedValue` where available.",
      code: `ThreadLocal<String> user = new ThreadLocal<>();
ExecutorService pool = Executors.newFixedThreadPool(1);          // one reused thread
pool.submit(() -> user.set("alice")).get();                      // request 1 forgets remove()
System.out.println("request 2 sees user = " + pool.submit(() -> user.get()).get());
pool.submit(() -> { try { user.set("bob"); /* handle request */ } finally { user.remove(); } }).get();
System.out.println("request 4 after a cleaned-up request: " + pool.submit(() -> user.get()).get());
pool.shutdown();`,
      analogy: "A shared hotel room: if a guest leaves their suitcase and housekeeping never clears the room, the next guest finds someone else's belongings, and the room fills up over time." },
    { title: "Leak #4: class loader leaks",
      text: "Each class keeps its **class loader** alive, and the loader keeps **every class it loaded** (plus their static fields) alive. Application servers and hot-reload tools create a new loader per deployment; if anything in a longer-lived loader holds one object from the old deployment (a JDBC driver registered in `DriverManager`, a thread started by the app, a ThreadLocal value, a static registry in a shared library) the whole old deployment stays in memory, and repeated redeploys end in `OutOfMemoryError: Metaspace`. The fix is to unregister and stop everything on shutdown.",
      code: `class Plugin { byte[] state = new byte[1_000_000]; }
class Registry { static final List<Object> PLUGINS = new ArrayList<>(); }      // lives in the parent (app) loader
java.net.URL[] urls = { Plugin.class.getProtectionDomain().getCodeSource().getLocation() };
java.net.URLClassLoader loader = new java.net.URLClassLoader(urls, ClassLoader.getPlatformClassLoader());   // a "deployment"
Class<?> c = loader.loadClass(Plugin.class.getName());
var ctor = c.getDeclaredConstructor(); ctor.setAccessible(true);
Registry.PLUGINS.add(ctor.newInstance());                                            // one object leaks out
var ref = new java.lang.ref.WeakReference<>(loader);
System.out.println("separate class? " + (c != Plugin.class));
loader.close(); loader = null; c = null; ctor = null;                              // "undeploy"
for (int i = 0; i < 5; i++) { System.gc(); Thread.sleep(20); }
System.out.println("old loader collected while registry holds a plugin: " + (ref.get() == null));
Registry.PLUGINS.clear();
for (int i = 0; i < 10 && ref.get() != null; i++) { System.gc(); Thread.sleep(20); }
System.out.println("after unregistering on shutdown:                    " + (ref.get() == null));`,
      analogy: "A single forgotten coat on a hook keeps the whole cloakroom (the old deployment) from being cleared out." },
    { title: "Taking heap dumps",
      text: "A heap dump is a snapshot of every object and reference. Get one **automatically** on OOM with `-XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/dumps` (always set this in production, on a volume that survives restarts), or **on demand** with `jcmd <pid> GC.heap_dump /tmp/app.hprof` (only live objects, forces a full GC), or programmatically via `HotSpotDiagnosticMXBean`. Dumps are roughly the size of the used heap, **pause the JVM** while written and contain **sensitive data** (passwords, tokens, personal data), so treat them like production database backups. A cheaper first look is `jcmd <pid> GC.class_histogram`.",
      table: [["Tool", "Use"],
        ["jcmd <pid> GC.class_histogram", "object counts by class, quick and small"],
        ["jcmd <pid> GC.heap_dump file", "full dump of live objects"],
        ["-XX:+HeapDumpOnOutOfMemoryError", "automatic dump at the moment of failure"],
        ["Eclipse MAT / VisualVM / IntelliJ", "open and analyse .hprof files"],
        ["JFR (jcmd JFR.start)", "allocation samples, old object sample (leak candidates) with low overhead"]],
      code: `var diag = ManagementFactory.getPlatformMXBean(com.sun.management.HotSpotDiagnosticMXBean.class);
Path file = Files.createTempDirectory("dumps").resolve("app.hprof");
List<byte[]> data = new ArrayList<>(); for (int i = 0; i < 1000; i++) data.add(new byte[10_000]);
diag.dumpHeap(file.toString(), true);                      // live = true: only reachable objects
System.out.printf("dump: %d MB for %d MB of heap in use%n", Files.size(file) >> 20, (Runtime.getRuntime().totalMemory() - Runtime.getRuntime().freeMemory()) >> 20);
System.out.println("HeapDumpOnOutOfMemoryError = " + diag.getVMOption("HeapDumpOnOutOfMemoryError").getValue());
Files.delete(file);
java.lang.ref.Reference.reachabilityFence(data);`,
      analogy: "A heap dump is a crime-scene photograph: every object exactly where it was, but taking it stops traffic and the photo contains everyone's private belongings." },
    { title: "Reading a dump: retained size and paths to GC roots",
      text: "**Shallow size** is an object's own bytes; **retained size** is everything that would be freed if it were collected, i.e. everything it **dominates** (every path from a GC root to those objects passes through it). MAT's **dominator tree** sorts objects by retained size and the *Leak Suspects* report points at the biggest one and its **accumulation point**, often an `Object[]` inside a list or a `HashMap$Node[]` holding thousands of similar entries. Then use **Path to GC Roots** (excluding weak references) to see *who* holds it: a static field, a thread, a class loader. The histogram tells you *what* is big; the dominator tree tells you *who keeps it*.",
      m: M(["flowchart TB",
        "  R[\"GC root: class Leaky<br/>static AUDIT\"]:::s1 --> L[\"ArrayList<br/>shallow 24 B, retained 61 MB\"]:::s3",
        "  L --> A[\"Object[] elementData<br/>accumulation point\"]:::s3",
        "  A --> R1[\"Request #1<br/>+ byte[1024]\"]:::s4",
        "  A --> R2[\"... 52,931 Requests\"]:::s4",
        "  classDef s1 fill:#dbeafe,stroke:#2563eb", "  classDef s3 fill:#ffebee,stroke:#c62828", "  classDef s4 fill:#e8f5e9,stroke:#2e7d32"]),
      table: [["Term", "Meaning"],
        ["Shallow size", "the object's own fields/array slots"],
        ["Retained size", "memory freed if this object became unreachable"],
        ["Dominator", "X dominates Y if every root-to-Y path goes through X"],
        ["Accumulation point", "where the many small objects hang off (Object[], Node[])"],
        ["Path to GC roots", "the reference chain that keeps it alive"]],
      analogy: "Shallow size is the weight of a single trolley; retained size is the trolley plus every trolley chained behind it that would roll away if you unhooked it." },
    { title: "A step-by-step OOM investigation",
      text: "First read the **exact message**: it names the area that ran out, and each has a different cause. Then: confirm the pattern in the GC log (rising heap-after-GC = leak; flat = undersized or spike); grab the automatic dump (or `jcmd` dumps a few minutes apart and compare); open it in MAT, look at the dominator tree and the path to GC roots; map the holder back to code; fix; and **verify** under the same load that heap-after-GC is flat. Only if the live set is legitimately big do you raise `-Xmx`. Container `OOMKilled` without a Java OOM points at non-heap memory: native memory tracking (`-XX:NativeMemoryTracking=summary`, `jcmd VM.native_memory`).",
      code: `class Boom { public static void main(String[] a) throws Exception {
    try {
        switch (a[0]) {
            case "heap" -> { List<long[]> l = new ArrayList<>(); while (true) l.add(new long[100_000]); }
            case "direct" -> java.nio.ByteBuffer.allocateDirect(8 << 20);
            case "array" -> { long[] huge = new long[Integer.MAX_VALUE]; }
            case "metaspace" -> { List<Object> keep = new ArrayList<>(); while (true) keep.add(java.lang.reflect.Proxy.newProxyInstance(new java.net.URLClassLoader(new java.net.URL[0]), new Class<?>[] { Runnable.class }, (p, m, x) -> null)); }
        }
    } catch (OutOfMemoryError e) { System.out.println(e); }
} }
String java = ProcessHandle.current().info().command().orElse("java");
String cp = Boom.class.getProtectionDomain().getCodeSource().getLocation().getPath();
for (String[] r : new String[][] { { "heap", "-Xmx32m" }, { "direct", "-XX:MaxDirectMemorySize=4m" }, { "array", "-Xmx64m" }, { "metaspace", "-XX:MaxMetaspaceSize=24m" } }) {
    Process p = new ProcessBuilder(java, r[1], "-cp", cp, "Boom", r[0]).redirectErrorStream(true).start();
    String out = new String(p.getInputStream().readAllBytes()).lines().filter(l -> l.contains("OutOfMemoryError")).findFirst().orElse("(none)");
    System.out.printf("%-28s %s%n", r[1], out.length() > 100 ? out.substring(0, 100) + "…" : out);
}`,
      analogy: "Like a doctor: read the symptom precisely (which OOM), look at the chart over time (GC log), take the X-ray (heap dump), find the cause, treat it, and do a follow-up check." }
  ];

  H.registerLesson({
    code: "J31",
    summary: "Practical memory work: telling a leak from an undersized heap or plain churn using heap-after-GC in the GC log, sizing the heap for containers (`-Xmx`, `MaxRAMPercentage`), the few G1 knobs worth touching, measuring allocation rate and deciding between tuning and fixing code, the classic leaks (static collections and unbounded caches, listeners and inner classes, ThreadLocal in pools, class loaders), taking heap dumps, reading retained size, dominator trees and paths to GC roots, and a step-by-step `OutOfMemoryError` investigation.",
    slides: SLIDES,
    widget: { heading: "Interactive: hunt four leaks (and one non-leak)", caption: "Each scenario was run on JDK 21 with G1, -Xmx64m, GC logging and HeapDumpOnOutOfMemoryError. The histogram is real jcmd output taken mid-run; the suspect path comes from the actual OOM heap dump, analysed with a small dominator-tree reader like MAT's.", render: j31Widget },
    examplesHeading: "Where this shows up at work",
    examples: [
      ["Pod restarts", "A service is OOMKilled every few days. The GC log shows heap-after-GC creeping up 50 MB a day: a session map that is never cleaned."],
      ["Container sizing", "A 2 GB pod running with defaults gets a 512 MB heap (25%); switching to `MaxRAMPercentage=75` fixes constant GC without a code change."],
      ["Redeploy OOM", "A Tomcat server dies with `OutOfMemoryError: Metaspace` after the tenth hot redeploy: a JDBC driver and a scheduler thread pin the old web-app class loader."],
      ["Data bleed", "Request B logs user A's id because a ThreadLocal-based context wasn't cleared in a pooled thread."],
      ["High CPU in GC", "A JSON-heavy service spends 15% CPU in young GCs; an allocation profile points at a per-call `ObjectMapper` and boxing, not at GC flags."],
      ["Post-mortem", "`HeapDumpOnOutOfMemoryError` on a persistent volume gives the on-call engineer a dump to open in MAT after the crash."]
    ],
    pitfalls: [
      "Raising `-Xmx` to 'fix' a leak (it only delays the OOM)",
      "Looking at heap used instead of heap after GC",
      "Setting `-Xmx` equal to the container limit (no room for non-heap memory)",
      "Fixing young-gen size (`-Xmn`) with G1, which disables pause-goal adaptation",
      "Unbounded `HashMap` caches and keys with broken `equals`/`hashCode`",
      "ThreadLocal without `remove()` in pooled threads",
      "Leaving heap dumps (full of secrets) lying around or uploading them to public tools",
      "Changing several GC flags at once without before/after logs"
    ],
    quiz: [
      { q: "Which GC-log pattern indicates a leak?", options: ["Many young GCs with a flat heap after GC", "Heap after GC rising over time, then Full GCs that free little", "A saw-tooth heap-used graph", "A single long pause at startup"], answer: 1, why: "Rising live set; widget step 1." },
      { q: "In the widget's churn scenario, what reduced GC work?", options: ["A larger heap", "Switching to ZGC", "Allocating less (reusing a builder, no temporary Strings)", "Calling System.gc()"], answer: 2, why: "~20× less allocation, far fewer young GCs, no flags changed." },
      { q: "In a 2 GB container with no heap flags, the default max heap is roughly…", options: ["2 GB", "1.5 GB", "512 MB (25%)", "64 MB"], answer: 2, why: "MaxRAMPercentage defaults to 25 and the JVM is container-aware." },
      { q: "A pod is OOMKilled (exit 137) but there's no Java OutOfMemoryError. Where do you look?", options: ["Heap dump", "Non-heap/native memory: Metaspace, threads, direct buffers (NMT)", "Young gen size", "MaxGCPauseMillis"], answer: 1, why: "The process, not the heap, exceeded the limit." },
      { q: "Why can a histogram alone fail to find a leak?", options: ["It's inaccurate", "It shows what is big, not who holds it (e.g. just byte[])", "It only counts young objects", "It needs a debugger"], answer: 1, why: "ThreadLocal and cache scenarios showed only byte[]." },
      { q: "What is an object's retained size?", options: ["Its own fields", "Memory freed if it became unreachable: everything it dominates", "Size of its class", "Total heap"], answer: 1, why: "Dominator tree concept." },
      { q: "Why does a non-static anonymous listener leak its enclosing object?", options: ["Lambdas are always leaky", "It holds an implicit reference to the outer instance", "It is stored in Metaspace", "It disables GC"], answer: 1, why: "this$0; use static nested classes or unregister." },
      { q: "What is the main risk of ThreadLocal in a thread pool?", options: ["Slower access", "Values survive across tasks: memory retention and data bleeding into the next request", "Deadlocks", "Thread starvation"], answer: 1, why: "Pair set with remove() in finally." },
      { q: "With G1, what's the recommended first knob for latency?", options: ["-Xmn", "-XX:MaxGCPauseMillis", "-XX:SurvivorRatio", "-XX:+DisableExplicitGC"], answer: 1, why: "Let G1 adapt young size to the pause goal." }
    ],
    cheatsheet: {
      table: [
        ["Need", "Command / flag"],
        ["Heap for containers", "`-XX:MaxRAMPercentage=75` (or `-Xms`=`-Xmx`)"],
        ["Pause goal", "`-XX:MaxGCPauseMillis=100`"],
        ["GC log", "`-Xlog:gc*:file=/logs/gc.log:time,uptime:filecount=5,filesize=20m`"],
        ["Dump on OOM", "`-XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/dumps`"],
        ["Histogram", "`jcmd <pid> GC.class_histogram`"],
        ["Dump now", "`jcmd <pid> GC.heap_dump /tmp/app.hprof`"],
        ["Native memory", "`-XX:NativeMemoryTracking=summary` + `jcmd <pid> VM.native_memory summary`"],
        ["Allocation profile", "`jcmd <pid> JFR.start duration=60s filename=rec.jfr`"]],
      cards: [
        { title: "Leak suspects", items: ["static collections", "unbounded caches", "listeners / inner classes", "ThreadLocal in pools", "class loaders, threads"] },
        { title: "Investigation", items: ["Read the OOM message", "Heap after GC trend", "Dump + dominator tree", "Path to GC roots", "Fix + verify flat"] },
        { title: "Say in interviews", items: ["Leak vs undersized vs churn", "Retained vs shallow", "Tune last, measure first", "OOMKilled ≠ OutOfMemoryError"] }]
    },
    practice: [
      { level: "Easy", q: "List the common causes of memory leaks in Java.",
        a: ["Static collections or singleton maps that only grow.",
          "Caches without size limits or expiry; keys with broken equals/hashCode.",
          "Listeners/callbacks never unregistered; inner classes capturing outer instances.",
          "ThreadLocal values in pooled threads; unclosed resources; class loaders pinned by threads, drivers or static registries."] },
      { level: "Easy", q: "How do you get a heap dump from a running service and on OOM?",
        a: ["On demand: `jcmd <pid> GC.heap_dump /path/app.hprof` (or HotSpotDiagnosticMXBean.dumpHeap).",
          "On failure: `-XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/dumps` on a persistent volume.",
          "Treat dumps as sensitive data; open them in MAT, VisualVM or IntelliJ."] },
      { level: "Easy", q: "Write a bounded LRU cache with the JDK only.",
        a: ["Extend LinkedHashMap with accessOrder = true.",
          "Override removeEldestEntry to evict past the limit.",
          "Not thread-safe: wrap or use Caffeine in production."],
        code: `class Lru<K, V> extends LinkedHashMap<K, V> {
    private final int max;
    Lru(int max) { super(16, 0.75f, true); this.max = max; }
    @Override protected boolean removeEldestEntry(Map.Entry<K, V> e) { return size() > max; }
}
Lru<Integer, String> c = new Lru<>(3);
c.put(1, "a"); c.put(2, "b"); c.put(3, "c"); c.get(1); c.put(4, "d");
System.out.println(c.keySet() + " (2 was least recently used)");` },
      { level: "Medium", q: "How do you size the heap for a service in Kubernetes with a 4 GiB memory limit?",
        a: ["Use `-XX:MaxRAMPercentage=70..75` (≈ 3 GiB heap) rather than hard-coding -Xmx, so it follows the limit.",
          "Leave room for Metaspace, thread stacks (~1 MB each), code cache, direct buffers and GC structures.",
          "Set requests = limits for memory; check with NMT and the GC log under load.",
          "Make sure CPU limits give the GC enough threads (or set ActiveProcessorCount)."] },
      { level: "Medium", q: "Show the ThreadLocal bleed in a pool and fix it.",
        a: ["A one-thread pool reuses the same thread for every task.",
          "Without remove(), the next task sees the previous value.",
          "Wrap set/use in try/finally with remove()."],
        code: `ThreadLocal<String> tenant = new ThreadLocal<>();
ExecutorService pool = Executors.newSingleThreadExecutor();
pool.submit(() -> tenant.set("acme")).get();
System.out.println("leaky: next task sees " + pool.submit(tenant::get).get());
pool.submit(tenant::remove).get();
pool.submit(() -> { tenant.set("globex"); try { /* work */ } finally { tenant.remove(); } }).get();
System.out.println("fixed: next task sees " + pool.submit(tenant::get).get());
pool.shutdown();` },
      { level: "Medium", q: "Measure how many bytes a method allocates per call.",
        a: ["Use com.sun.management.ThreadMXBean.getThreadAllocatedBytes on the current thread.",
          "Warm up first, then average over many calls.",
          "For real apps use JFR allocation events or async-profiler."],
        code: `var tmx = (com.sun.management.ThreadMXBean) ManagementFactory.getThreadMXBean();
long me = Thread.currentThread().threadId();
Supplier<String> work = () -> String.join(",", List.of("a", "b", "c")).toUpperCase();
for (int i = 0; i < 10_000; i++) work.get();
long b0 = tmx.getThreadAllocatedBytes(me);
for (int i = 0; i < 100_000; i++) work.get();
System.out.println("≈ " + (tmx.getThreadAllocatedBytes(me) - b0) / 100_000 + " bytes per call");` },
      { level: "Medium", q: "Explain shallow vs retained size and the dominator tree.",
        a: ["Shallow: the object's own memory (header + fields or array slots).",
          "Retained: what would be freed if the object were gone: all objects only reachable through it.",
          "Dominator tree: parent of each object is its immediate dominator; sorting by retained size points straight at leak suspects."] },
      { level: "Hard", q: "Production heap grows slowly and the service OOMs every 3 days. Walk through the investigation.",
        steps: ["Confirm from GC logs/metrics that heap-after-GC (old gen after collection) trends upward, not just usage spikes.",
          "Ensure HeapDumpOnOutOfMemoryError is set, or take two jcmd dumps hours apart (live) to compare.",
          "Open in MAT: Leak Suspects, dominator tree; compare histograms between dumps to see which classes grow.",
          "Use Path to GC Roots (excluding weak refs) to find the holder: static field, thread, ThreadLocal, loader.",
          "Map to code, fix (bound, evict, unregister, remove), add a metric (cache size), and verify flat heap-after-GC under load."] },
      { level: "Hard", q: "Distinguish the OutOfMemoryError messages and what each means.",
        a: ["Java heap space: heap live set exceeded -Xmx (leak or undersized).",
          "GC overhead limit exceeded: >98% time in GC freeing <2% (Parallel GC); effectively heap space.",
          "Metaspace: too many classes / class-loader leak.",
          "Direct buffer memory: off-heap NIO buffers beyond MaxDirectMemorySize.",
          "Unable to create native thread: OS/thread limits or memory for stacks.",
          "Requested array size exceeds VM limit: a single array larger than the JVM allows."] },
      { level: "Hard", q: "Prove that a class loader is collected once nothing references it (and leaked while something does).",
        a: ["Load a class through a fresh URLClassLoader, keep a WeakReference to the loader.",
          "Store an instance in a static list in the parent loader: the loader survives GC.",
          "Clear the list: the loader becomes collectable."],
        code: `class Widget { }
class Holder { static final List<Object> KEEP = new ArrayList<>(); }
java.net.URLClassLoader l = new java.net.URLClassLoader(new java.net.URL[] { Widget.class.getProtectionDomain().getCodeSource().getLocation() }, ClassLoader.getPlatformClassLoader());
var ctor = l.loadClass("Widget").getDeclaredConstructor(); ctor.setAccessible(true);
Holder.KEEP.add(ctor.newInstance());
var ref = new java.lang.ref.WeakReference<>(l);
l = null; ctor = null;
for (int i = 0; i < 5; i++) { System.gc(); Thread.sleep(20); }
System.out.println("loader alive while an instance is held: " + (ref.get() != null));
Holder.KEEP.clear();
for (int i = 0; i < 10 && ref.get() != null; i++) { System.gc(); Thread.sleep(20); }
System.out.println("loader collected after clearing:       " + (ref.get() == null));` }
    ],
    recap: [
      "Judge memory by heap after GC: rising = leak, flat but high = undersized, flat and low with many GCs = churn.",
      "Size heaps with MaxRAMPercentage in containers and leave room for non-heap memory.",
      "Tune last: one flag at a time, with logs; most wins come from heap size and allocating less.",
      "Classic leaks: static collections, unbounded caches, listeners, ThreadLocal in pools, class loaders.",
      "Dump on OOM, read the dominator tree and path to GC roots, fix, and verify the heap is flat."
    ]
  });
})();
