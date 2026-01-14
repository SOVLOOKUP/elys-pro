<template>
  <UCard>
    <MAutoForm
      class="space-y-2"
      :submitButton="false"
      :state="uploadForm.config"
      :schema="schema"
    />
  </UCard>
</template>

<script setup lang="ts">
import { type OpendalSchema } from "backend/src/loader/protocal/opendal/generated/schema";
import schemaConfig from "backend/src/loader/protocal/opendal/generated/schemaConfig";

// 上传表单
const uploadForm = defineModel<{
  name: string;
  version: string;
  protocol: OpendalSchema;
  config: Record<string, unknown>;
  path: string;
}>({
  required: true,
});

const schema = computed(() => {
  return schemaConfig[uploadForm.value.protocol];
});
</script>
