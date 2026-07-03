//! 运行时可热更新的模型映射表。

use std::sync::OnceLock;

use parking_lot::RwLock;

use crate::model::config::ModelEntry;

static MODEL_REGISTRY: OnceLock<RwLock<Vec<ModelEntry>>> = OnceLock::new();

fn registry() -> &'static RwLock<Vec<ModelEntry>> {
    MODEL_REGISTRY.get_or_init(|| RwLock::new(Vec::new()))
}

pub fn set_models(models: Vec<ModelEntry>) {
    *registry().write() = models;
}

pub fn get_models() -> Vec<ModelEntry> {
    registry().read().clone()
}
