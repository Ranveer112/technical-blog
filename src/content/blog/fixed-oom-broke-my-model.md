---
title: "How Fixing an OOM Error Quietly Broke My Model"
description: "I capped my vocabulary to survive a Kaggle OOM. The loss dropped, the accuracy looked fine — and the model had learned nothing but token frequencies. A debugging story."
date: 2026-07-19
category: "AI/ML"
tags:
  - transformers
  - debugging
  - pytorch
draft: false
---

For the past few weeks I have been **hand-writing a simple transformer from scratch** — building the pieces myself straight out of the original [*Attention Is All You Need*](https://arxiv.org/pdf/1706.03762) paper rather than reaching for a library — and training it on the
[Parenting Stack Exchange](https://parenting.stackexchange.com/) dump. The goal was to learn by doing; what I actually learned was how many quiet ways a from-scratch model can fail.

After parsing `Posts.xml`, the corpus came out to:

- **6,872** questions (**6,734** with at least one answer)
- **22,601** answers → **22,601** question/answer pairs (avg **3.29** answers per question)
- **~60.3M** characters once flattened into a single training stream
- **~15.1M** word-level tokens after tokenization

Each pair is serialized as `<Q>…<A>…` and joined with a `<D>` document separator,
then fed to the model as one long autoregressive stream. The `<pad>` token is used for batching, and anything outside the 300 most-common words becomes `<unk>`.

## The architecture

It is a deliberately small, GPT-style decoder with **weight tying** — the output
projection reuses the embedding matrix (`Eᵀ`) instead of learning its own:

<figure style="margin:1.75rem 0;"><svg viewBox="0 0 440 410" width="100%" role="img" aria-label="Transformer forward pass" style="max-width:440px;display:block;margin:0 auto;"><defs><marker id="ah" markerWidth="8" markerHeight="8" refX="4" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" style="fill:var(--text-muted)"/></marker></defs><rect x="60" y="8" width="320" height="44" rx="8" style="fill:var(--bg-soft);stroke:var(--border)"/><text x="220" y="35" text-anchor="middle" font-size="13" style="fill:var(--text)">Token IDs&#160;&#160;(B=1000, T=254)</text><line x1="220" y1="52" x2="220" y2="74" style="stroke:var(--text-muted)" marker-end="url(#ah)"/><rect x="60" y="76" width="320" height="44" rx="8" style="fill:var(--bg-soft);stroke:var(--border)"/><text x="220" y="103" text-anchor="middle" font-size="13" style="fill:var(--text)">Embedding &#215; &#8730;d&#160;&#160;(V=302 &#8594; d=200)</text><line x1="220" y1="120" x2="220" y2="142" style="stroke:var(--text-muted)" marker-end="url(#ah)"/><rect x="60" y="144" width="320" height="44" rx="8" style="fill:var(--bg-soft);stroke:var(--border)"/><text x="220" y="171" text-anchor="middle" font-size="13" style="fill:var(--text)">+ Sinusoidal positional encoding</text><line x1="220" y1="188" x2="220" y2="210" style="stroke:var(--text-muted)" marker-end="url(#ah)"/><rect x="60" y="212" width="320" height="52" rx="8" style="fill:var(--accent-soft);stroke:var(--accent)"/><text x="220" y="233" text-anchor="middle" font-size="13" font-weight="600" style="fill:var(--text)">Transformer block &#215; 1</text><text x="220" y="251" text-anchor="middle" font-size="11" style="fill:var(--text-muted)">self-attention + feed-forward</text><line x1="220" y1="264" x2="220" y2="286" style="stroke:var(--text-muted)" marker-end="url(#ah)"/><rect x="60" y="288" width="320" height="44" rx="8" style="fill:var(--bg-soft);stroke:var(--border)"/><text x="220" y="315" text-anchor="middle" font-size="12.5" style="fill:var(--text)">Tied projection E&#7488; (shared weights)</text><line x1="220" y1="332" x2="220" y2="354" style="stroke:var(--text-muted)" marker-end="url(#ah)"/><rect x="60" y="356" width="320" height="44" rx="8" style="fill:var(--bg-soft);stroke:var(--border)"/><text x="220" y="383" text-anchor="middle" font-size="12.5" style="fill:var(--text)">Logits&#160;&#160;(B, T, V) = (1000, 254, 302)</text></svg><figcaption style="text-align:center;font-size:0.85rem;color:var(--text-muted);margin-top:0.5rem;">A single-block decoder with tied embedding/output weights.</figcaption></figure>

The full configuration:

| Group | Hyperparameter | Value |
|---|---|---|
| Data | `MAX_VOCAB` | 300 (+2 reserved) |
| Data | `sequence_length` | 254 |
| Model | `embedding_dimensions` | 200 |
| Model | `num_blocks` | 1 |
| Model | `feedforward_hidden_layer_depth`¹ | 1 (used as width) |
| Training | `batch_size` | 1000 |
| Training | `learning_rate` | 0.01 |
| Training | `EPOCHS` | 6 |

Training ran on Kaggle's **2× T4** GPUs — 16 GB of memory each.

¹ This hyperparameter was meant to be *width*, not depth. It forced the feed-forward hidden layer to `1` neuron. That bug is the second half of the story.



## Bug 1: the fix that caused the real bug

After fixing bugs, my model finally started to train but before any diagnostic from first batch came in, Kaggle threw an out of memory on me, I eventually got it singled out to unbounded vocabulary size.

Essentially, I was using **word-level** tokenization, so every distinct word in the corpus became its own token — the vocabulary ballooned into the tens of thousands. The output layer materializes one logit per vocab entry per position, so the logits tensor alone is:

```
batch_size × sequence_length × vocab_size × 4 bytes (fp32)
= 1000 × 254 × V × 4
```

At `V = 300` that is already ~0.3 GB *just for the logits* — and the softmax probabilities plus backward-pass gradients roughly triple it. Scale `V` into the tens of thousands and the tensor grows linearly into the tens of gigabytes, sailing straight past the 16 GB ceiling.

Seeing this, I capped the vocabulary size to just the 300 most common tokens and mapped every other word to `<unk>`.


## Why the loss lied to me

The model did train. When I checked back in the morning the test accuracy and loss were **13.39%** and **3.7093** respectively. Excited to see the toddler give me parenting advice, I threw in the prompt *"How to raise"* at temperature `0.1` and got back `<unk>`. Raising the temperature to `0.7` mixed in tokens like `the`, but the output was still predominantly `<unk>`.


I realized the bound of 300 might be too harsh — most tokens were now `<unk>`. So I averaged the model's output probabilities over 10 test batches and laid them side by side with the corpus token frequencies. They don't just correlate — **all 20 of the top-20 tokens appear in the exact same rank order (a 20/20 match)**, and the magnitudes line up to within a few hundredths of a percent:

<figure style="margin:1.75rem 0;"><svg viewBox="0 0 640 300" width="100%" role="img" aria-label="Model averaged confidence vs corpus token frequency" style="display:block;font-family:var(--font-sans);font-size:10px;"><rect x="48" y="6" width="12" height="12" style="fill:var(--accent)"/><text x="64" y="16" style="fill:var(--text-muted)">Model avg confidence (test)</text><rect x="258" y="6" width="12" height="12" style="fill:#e8703a"/><text x="274" y="16" style="fill:var(--text-muted)">Corpus token frequency</text><line x1="44" y1="270" x2="632" y2="270" style="stroke:var(--border)"/><line x1="44" y1="216.5" x2="632" y2="216.5" style="stroke:var(--border);opacity:0.5"/><text x="38" y="219.5" text-anchor="end" style="fill:var(--text-muted)">5</text><line x1="44" y1="163" x2="632" y2="163" style="stroke:var(--border);opacity:0.5"/><text x="38" y="166" text-anchor="end" style="fill:var(--text-muted)">10</text><line x1="44" y1="109.5" x2="632" y2="109.5" style="stroke:var(--border);opacity:0.5"/><text x="38" y="112.5" text-anchor="end" style="fill:var(--text-muted)">15</text><line x1="44" y1="56" x2="632" y2="56" style="stroke:var(--border);opacity:0.5"/><text x="38" y="59" text-anchor="end" style="fill:var(--text-muted)">20</text><text x="38" y="273" text-anchor="end" style="fill:var(--text-muted)">0</text><rect x="55.7" y="32.5" width="15" height="237.5" style="fill:var(--accent)"/><rect x="73.7" y="31.5" width="15" height="238.5" style="fill:#e8703a"/><rect x="104.0" y="221.8" width="15" height="48.2" style="fill:var(--accent)"/><rect x="122.0" y="222.0" width="15" height="48.0" style="fill:#e8703a"/><rect x="152.3" y="221.8" width="15" height="48.2" style="fill:var(--accent)"/><rect x="170.3" y="222.0" width="15" height="48.0" style="fill:#e8703a"/><rect x="200.7" y="229.3" width="15" height="40.7" style="fill:var(--accent)"/><rect x="218.7" y="229.7" width="15" height="40.3" style="fill:#e8703a"/><rect x="249.0" y="237.9" width="15" height="32.1" style="fill:var(--accent)"/><rect x="267.0" y="238.1" width="15" height="31.9" style="fill:#e8703a"/><rect x="297.3" y="241.1" width="15" height="28.9" style="fill:var(--accent)"/><rect x="315.3" y="241.2" width="15" height="28.8" style="fill:#e8703a"/><rect x="345.7" y="241.1" width="15" height="28.9" style="fill:var(--accent)"/><rect x="363.7" y="241.8" width="15" height="28.2" style="fill:#e8703a"/><rect x="394.0" y="243.2" width="15" height="26.8" style="fill:var(--accent)"/><rect x="412.0" y="243.4" width="15" height="26.6" style="fill:#e8703a"/><rect x="442.3" y="246.5" width="15" height="23.5" style="fill:var(--accent)"/><rect x="460.3" y="246.0" width="15" height="24.0" style="fill:#e8703a"/><rect x="490.7" y="249.7" width="15" height="20.3" style="fill:var(--accent)"/><rect x="508.7" y="249.6" width="15" height="20.4" style="fill:#e8703a"/><rect x="539.0" y="250.7" width="15" height="19.3" style="fill:var(--accent)"/><rect x="557.0" y="250.3" width="15" height="19.7" style="fill:#e8703a"/><rect x="587.3" y="252.9" width="15" height="17.1" style="fill:var(--accent)"/><rect x="605.3" y="252.8" width="15" height="17.2" style="fill:#e8703a"/><text x="72.2" y="284" text-anchor="middle" style="fill:var(--text)">&lt;unk&gt;</text><text x="120.5" y="284" text-anchor="middle" style="fill:var(--text)">&gt;</text><text x="168.8" y="284" text-anchor="middle" style="fill:var(--text)">&lt;</text><text x="217.2" y="284" text-anchor="middle" style="fill:var(--text)">.</text><text x="265.5" y="284" text-anchor="middle" style="fill:var(--text)">,</text><text x="313.8" y="284" text-anchor="middle" style="fill:var(--text)">p</text><text x="362.2" y="284" text-anchor="middle" style="fill:var(--text)">/</text><text x="410.5" y="284" text-anchor="middle" style="fill:var(--text)">to</text><text x="458.8" y="284" text-anchor="middle" style="fill:var(--text)">the</text><text x="507.2" y="284" text-anchor="middle" style="fill:var(--text)">a</text><text x="555.5" y="284" text-anchor="middle" style="fill:var(--text)">and</text><text x="603.8" y="284" text-anchor="middle" style="fill:var(--text)">&#39;</text></svg><figcaption style="text-align:center;font-size:0.85rem;color:var(--text-muted);margin-top:0.5rem;">Model's averaged output probability on test batches (blue) vs. corpus token frequency (orange), top 12 tokens; y-axis in %. The pairs are nearly indistinguishable — across the full top-20 the rank order matches 1:1. The model simply reproduced the unigram distribution.</figcaption></figure>

## Bug 2: a feed-forward layer one neuron wide

The vocabulary cap was the most visible failure, but it wasn't the only one. When I went back and audited the notebook, I discovered I had **accidentally** made the feed-forward hidden layer only one neuron wide.

Every 200-dimensional token embedding was funneled through this single scalar and back out again.

I had a hyperparameter called `feedforward_hidden_layer_depth` and set it to `1`, but I was using it as the **width** of the hidden layer:

```python
self.feed_forward = nn.Sequential(
    nn.Linear(embedding_dimensions, feedforward_hidden_layer_depth),  # 200 -> 1
    nn.ReLU(),
    nn.Linear(feedforward_hidden_layer_depth, embedding_dimensions),  # 1 -> 200
)
```

A proper transformer feed-forward network is usually the widest part of the block — about `4 × d_model` (the original paper uses d_model = 512 and d_ff = 2048), or ~800 neurons here. It holds most of the model's parameters and most of its representational capacity.

The parameter count comes straight from the two `nn.Linear` layers:

```text
Linear(200, 800) weights: 200 × 800 = 160,000
Linear(200, 800) biases:            800 =     800
Linear(800, 200) weights: 800 × 200 = 160,000
Linear(800, 200) biases:            200 =     200
-----------------------------------------------
Proper FFN:                      321,000

My FFN:
Linear(200, 1) weights:   200 × 1   =     200
Linear(200, 1) biases:              1 =       1
Linear(1, 200) weights:   1 × 200   =     200
Linear(1, 200) biases:            200 =     200
-----------------------------------------------
Actual FFN:                          601
```

So the correct FFN should have been roughly **321,000 parameters** (`200 → 800 → 200` plus biases); mine had **601** — a **~530× cut** to the single most important sublayer. No vocabulary fix was probably going to rescue a block that can't hold more than one number of internal state.

## Takeaways

a) Writing models from scratch is hard and requires a lot of attention to detail, pun intended. While good exercise for learning, it's probably a bad idea for practical use.

b) The metrics being optimized are a proxy for the model quality. Always play with your model's outputs.
For example: 0-1 accuracy and loss of 13% and 3.793 respectively on 300+ vocabulary seemed promising yet the model is useless.