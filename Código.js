// 🔹 Armazena progresso no Google Scripts
var SCRIPT_PROPERTIES = PropertiesService.getScriptProperties();
var CHECKPOINT_FOLDER_KEY = "LAST_PROCESSED_FOLDER_ID";
var CHECKPOINT_FILE_KEY = "LAST_PROCESSED_FILE_ID";

// 🔹 Contadores globais
var totalArquivosProcessados = 0;
var totalPastasProcessadas = 0;
var totalArquivosRestaurados = 0;

// 🚪 Função para exibir a interface
function doGet() {
  return HtmlService.createHtmlOutputFromFile('ui')
    .setTitle('Recuperação de Arquivos')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// 🚀 Função principal modificada
function restaurarVersoesArquivos(folderId) {
  try {
    resetContadores();
    var mainFolder = validarPasta(folderId);

    Logger.log("🚀 Iniciando restauração na pasta: " + mainFolder.getName());
    processarPasta(mainFolder);

    return {
      success: true,
      logs: Logger.getLog().split('\n'),
      stats: {
        pastas: totalPastasProcessadas,
        processados: totalArquivosProcessados,
        restaurados: totalArquivosRestaurados
      }
    };

  } catch (e) {
    Logger.log("❌ Erro crítico: " + e.message);
    return {
      success: false,
      error: e.message,
      logs: Logger.getLog().split('\n')
    };
  }
}

// 🔄 Função para resetar contadores
function resetContadores() {
  totalArquivosProcessados = 0;
  totalPastasProcessadas = 0;
  totalArquivosRestaurados = 0;
}

// 🔍 Validação da pasta
function validarPasta(folderId) {
  if (!folderId) throw new Error("ID da pasta não informado!");
  try {
    return DriveApp.getFolderById(folderId);
  } catch (e) {
    throw new Error("Pasta não encontrada. Verifique o ID!");
  }
}

// 🔄 Função que processa todas as pastas e subpastas recursivamente
function processarPasta(folder) {
  totalPastasProcessadas++;
  Logger.log("📂 Processando pasta: " + folder.getName());

  // 🔹 Processa arquivos dentro da pasta
  var files = folder.getFiles();
  while (files.hasNext()) {
    var file = files.next();
    totalArquivosProcessados++;
    processarArquivo(file, folder);
  }

  // 🔹 Processa todas as subpastas dentro da pasta
  var subfolders = folder.getFolders();
  while (subfolders.hasNext()) {
    var subfolder = subfolders.next();
    processarPasta(subfolder); // Chamada recursiva para cada subpasta
  }
}

// 🔧 Função que restaura versões anteriores dos arquivos
function processarArquivo(file, folder) {
  var fileId = file.getId();

  try {
    // Verifica se o arquivo é o READ_NOTE.html
    if (file.getName() === "READ_NOTE.html") {
      file.setTrashed(true); // Mover para lixeira
      Logger.log("🗑️ Arquivo READ_NOTE.html excluído.");
      return;
    }

    var revisions = Drive.Revisions.list(fileId).items;
    if (revisions && revisions.length > 1) {
      var previousRevision = revisions[revisions.length - 2]; // Última versão antes do ataque
      var previousVersionId = previousRevision.id;

      Logger.log("🔄 Restaurando: " + file.getName());

      var url = "https://www.googleapis.com/drive/v2/files/" + fileId + "/revisions/" + previousVersionId;
      var headers = { "Authorization": "Bearer " + ScriptApp.getOAuthToken() };
      var response = UrlFetchApp.fetch(url, { headers: headers, muteHttpExceptions: true });
      var data = JSON.parse(response.getContentText());

      if (data.downloadUrl) {
        var fileResponse = UrlFetchApp.fetch(data.downloadUrl, { headers: headers });
        var blob = fileResponse.getBlob();

        var originalName = file.getName();
        var newName = originalName.replace(/\.hyena25$/, ""); // Corrige o nome
        blob.setName(newName);

        var newFile = folder.createFile(blob);
        file.setTrashed(true);
        totalArquivosRestaurados++;

        Logger.log("✅ Arquivo restaurado e renomeado: " + newName);
      } else {
        Logger.log("⚠️ Falha ao restaurar: " + file.getName());
      }
    } else {
      Logger.log("⚠️ Nenhuma versão anterior disponível para: " + file.getName());
    }

  } catch (e) {
    Logger.log("❌ Erro ao restaurar " + file.getName() + ": " + e.message);
  }
}