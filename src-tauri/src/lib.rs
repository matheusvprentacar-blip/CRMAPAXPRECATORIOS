use chrono::Utc;
use serde::Serialize;
use serde_json::{json, Value};
use std::time::Duration;

const DATAJUD_BASE_URL: &str = "https://api-publica.datajud.cnj.jus.br";
const DATAJUD_DEFAULT_API_KEY: &str =
  "APIKey cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==";

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DataJudQuery {
  numero_processo: String,
  tribunal_alias: String,
  endpoint: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DataJudMeta {
  took: Option<i64>,
  timed_out: bool,
  total_resultados: usize,
  fetched_at: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DataJudConsultaSuccess {
  ok: bool,
  query: DataJudQuery,
  meta: DataJudMeta,
  found: bool,
  source: Option<Value>,
  raw_response: Value,
}

fn normalize_process_number(value: &str) -> String {
  value
    .chars()
    .filter(|char| char.is_ascii_digit())
    .take(20)
    .collect()
}

fn normalize_datajud_authorization(value: Option<String>) -> String {
  let cleaned = value
    .unwrap_or_default()
    .trim()
    .trim_matches(|char| char == '"' || char == '\'')
    .to_string();

  if cleaned.is_empty() {
    DATAJUD_DEFAULT_API_KEY.to_string()
  } else if cleaned.starts_with("APIKey ") {
    cleaned
  } else {
    format!("APIKey {cleaned}")
  }
}

fn get_datajud_api_key() -> String {
  normalize_datajud_authorization(std::env::var("DATAJUD_API_KEY").ok())
}

fn get_total_hits(response: &Value) -> usize {
  response
    .pointer("/hits/total/value")
    .and_then(Value::as_u64)
    .map(|value| value as usize)
    .or_else(|| {
      response
        .pointer("/hits/total")
        .and_then(Value::as_u64)
        .map(|value| value as usize)
    })
    .or_else(|| {
      response
        .pointer("/hits/hits")
        .and_then(Value::as_array)
        .map(Vec::len)
    })
    .unwrap_or(0)
}

fn get_first_source(response: &Value) -> Option<Value> {
  response.pointer("/hits/hits/0/_source").cloned()
}

fn map_transport_error(error: reqwest::Error) -> String {
  if error.is_timeout() {
    "A consulta ao DataJud demorou demais para responder.".to_string()
  } else {
    format!("Erro ao comunicar com o DataJud. {error}")
  }
}

#[tauri::command]
#[allow(non_snake_case)]
async fn consultar_datajud(
  numeroProcesso: String,
  tribunalAlias: String,
  endpoint: String,
) -> Result<DataJudConsultaSuccess, String> {
  let numero_processo = normalize_process_number(&numeroProcesso);
  if numero_processo.len() != 20 {
    return Err("Numero de processo CNJ invalido. Informe exatamente 20 digitos.".to_string());
  }

  let tribunal_alias = tribunalAlias.trim().to_string();
  let endpoint = endpoint.trim().trim_start_matches('/').to_string();
  if tribunal_alias.is_empty() || endpoint.is_empty() {
    return Err("Endpoint do tribunal invalido para consulta DataJud.".to_string());
  }

  let client = reqwest::Client::builder()
    .timeout(Duration::from_secs(20))
    .build()
    .map_err(|error| format!("Nao foi possivel iniciar a consulta DataJud. {error}"))?;

  let response = client
    .post(format!("{DATAJUD_BASE_URL}/{endpoint}"))
    .header(reqwest::header::CONTENT_TYPE, "application/json")
    .header(reqwest::header::ACCEPT, "application/json")
    .header(reqwest::header::AUTHORIZATION, get_datajud_api_key())
    .json(&json!({
      "size": 1,
      "track_total_hits": true,
      "query": {
        "match": {
          "numeroProcesso": numero_processo,
        }
      }
    }))
    .send()
    .await
    .map_err(map_transport_error)?;

  let status = response.status();
  let response_text = response
    .text()
    .await
    .map_err(|error| format!("Nao foi possivel ler a resposta do DataJud. {error}"))?;

  if !status.is_success() {
    let details = if response_text.trim().is_empty() {
      format!("HTTP {}", status.as_u16())
    } else {
      response_text
    };

    return Err(format!("Falha ao consultar DataJud. {details}"));
  }

  let raw_response: Value = serde_json::from_str(&response_text)
    .map_err(|error| format!("Nao foi possivel interpretar a resposta do DataJud. {error}"))?;
  let source = get_first_source(&raw_response);
  let total_resultados = get_total_hits(&raw_response);

  Ok(DataJudConsultaSuccess {
    ok: true,
    query: DataJudQuery {
      numero_processo,
      tribunal_alias,
      endpoint,
    },
    meta: DataJudMeta {
      took: raw_response.get("took").and_then(Value::as_i64),
      timed_out: raw_response
        .get("timed_out")
        .and_then(Value::as_bool)
        .unwrap_or(false),
      total_resultados,
      fetched_at: Utc::now().to_rfc3339(),
    },
    found: source.is_some(),
    source,
    raw_response,
  })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![consultar_datajud])
    .setup(|app| {
      #[cfg(desktop)]
      app
        .handle()
        .plugin(tauri_plugin_updater::Builder::new().build())?;

      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .plugin(tauri_plugin_notification::init())
    .plugin(tauri_plugin_process::init())
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
