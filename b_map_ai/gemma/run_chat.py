"""Interactive Multi-turn Chat with Gemma 3.

Run this script using the configured environment:
    e:\\v\\Scripts\\python.exe run_chat.py
"""

import os
import sys

# Suppress verbose TensorFlow / JAX initialization notices
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

from gemma import gm
from gemma.gm.text._tokenizer import Gemma3Tokenizer
import kagglehub

def get_weights_and_tokenizer():
    """Retrieves locally cached weights and tokenizer via KaggleHub."""
    print("Checking for Gemma 3 (1B) weights...")
    kaggle_id = "google/gemma-3/flax/gemma3-1b-it"
    weights_dir = kagglehub.model_download(kaggle_id)
    print(f"Weights directory: {weights_dir}")

    # Check for inner checkpoint directory
    inner_ckpt = os.path.join(weights_dir, "gemma3-1b-it")
    ckpt_path = inner_ckpt if os.path.exists(inner_ckpt) else weights_dir

    # Check for local tokenizer.model
    tok_file = os.path.join(weights_dir, "tokenizer.model")
    if os.path.exists(tok_file):
        tokenizer = Gemma3Tokenizer(path=tok_file)
        print("Loaded local tokenizer from disk.")
    else:
        tokenizer = None

    return ckpt_path, tokenizer

def main():
    print("=" * 60)
    print("Initializing Gemma 3 (Option A: Multi-turn Chat)")
    print("=" * 60)

    # 1. Initialize 1B architecture
    print("\nInitializing model architecture: Gemma 3 (1B)...")
    model = gm.nn.Gemma3_1B()

    # 2. Get local weights & tokenizer
    ckpt_path, tokenizer = get_weights_and_tokenizer()

    # 3. Load parameters into memory
    print("\nLoading weights into memory...")
    params = gm.ckpts.load_params(ckpt_path)
    print("Weights loaded successfully!")

    # 4. Create multi-turn chat sampler
    print("\nInitializing ChatSampler (First turn will JIT-compile)...")
    sampler = gm.text.ChatSampler(
        model=model,
        params=params,
        tokenizer=tokenizer,
        multi_turn=True,
        print_stream=True,  # Stream tokens live to console
    )

    print("\n" + "=" * 60)
    print("Gemma is ready! Type your message (or 'exit' to quit).")
    print("=" * 60 + "\n")

    while True:
        try:
            user_input = input("\nYou: ").strip()
            if not user_input:
                continue
            if user_input.lower() in ("exit", "quit", "q"):
                print("Goodbye!")
                break

            print("\nGemma: ", end="", flush=True)
            sampler.chat(user_input)
            print()
        except KeyboardInterrupt:
            print("\nSession ended. Exiting.")
            break
        except Exception as e:
            print(f"\nError during generation: {e}")

if __name__ == "__main__":
    main()
