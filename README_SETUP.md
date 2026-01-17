# Local LLM & Hybrid Architecture Setup Guide

This guide explains how to connect this application to your self-hosted models while utilizing Google Gemini for voice services.

## 1. Local Runtime Options (AMD RX 550 / Vulkan)

Since you are using AMD RX 550 GPUs, you should prioritize runtimes that support **Vulkan** for hardware acceleration.

### A. Ollama (Recommended for ease of use)
Ollama provides an OpenAI-compatible endpoint at port `11434`.
1. **Install**: [ollama.com](https://ollama.com)
2. **Run with Vulkan**: On Linux, ensure `libvulkan1` is installed. Ollama usually detects Vulkan automatically on modern drivers.
3. **Pull a Model**: `ollama pull phi3` (Recommended for RX 550 due to 4GB VRAM).
4. **App Config**:
   - Base URL: `http://localhost:11434/v1`
   - Model ID: `phi3`

### B. vLLM (Recommended for Performance)
vLLM is excellent for serving. Use the OpenCL or Vulkan backend if available for your specific kernel.
1. **Run Command**:
   ```bash
   python -m vllm.entrypoints.openai.api_server --model microsoft/Phi-3-mini-4k-instruct --port 8000
   ```
2. **App Config**:
   - Base URL: `http://localhost:8000/v1`
   - Model ID: `microsoft/Phi-3-mini-4k-instruct`

### C. llama.cpp (Best for older hardware)
1. **Build with Vulkan**:
   ```bash
   cmake -B build -DGGML_VULKAN=1
   cmake --build build --config Release
   ```
2. **Start Server**:
   ```bash
   ./bin/llama-server -m your_model.gguf --port 8080
   ```
3. **App Config**:
   - Base URL: `http://localhost:8080/v1`

## 2. Hybrid Operation
- **Voice (Live API)**: Always uses Gemini 2.5 Flash for low-latency audio.
- **Text (Assistant)**: Switch between Gemini Pro (Cloud) and your Local model in the **Settings (tune icon)**.

## 3. Recommended Models for RX 550
Given the 4GB VRAM limit on most RX 550s:
- **Phi-3 Mini (3.8B)**: Excellent logic, fits entirely in VRAM.
- **Gemma-2-2b**: Google's small model, very fast.
- **Qwen2-1.5b**: Great for short instructions.
