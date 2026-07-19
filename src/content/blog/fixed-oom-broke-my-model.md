Past weeks, I have been training a transformer on the posts of Parenting stack exchange dataset(insert stats of the dataset from the notebook). The architecture of this transformer can be found below
[Insert stats from the notebook]


This model is being trained on a GPU T4 x2 with a 16GB memory



## The real fix that caused the real bug

<!--
The heart of the post:
- To dodge OOM, you capped the vocabulary aggressively (state the real number).
- Rare words were routed to a token... but they collapsed into <pad>, not a real <unk>.
- So the model learned "when unsure, predict padding." It poisoned training.
- Explain WHY this is subtle: loss decreases, metrics look fine, but the model learned nothing useful.
This is the "aha" section. Spend the most time here.
-->


After fixing bugs, my model finally started to train but before any diagnostic from first batch came in, Kaggle threw an out of memory on me, I eventually got it singled out to me not capping my vocabulary size.

Essentially, I was using a word level tokenization scheme and parenting stack exchange had [insert token count] distinct word tokens. With this scheme, the total number of logit values in the output layer are (batch_size*seq_layer*vocab_size). Plugging in the values and float width, this exceeds 16GB memory.

Seeing this, I capped the vocabulary size to just be 200 most common tokens and truncated every other token outside this as <unk>.


## Why the loss lied to me

<!--
The reflection beat. This is what makes it a credibility post, not a tutorial:
- A dropping loss curve told you it was learning. It wasn't.
- What you actually learned about trusting metrics vs. inspecting outputs.
- The general principle beyond this one bug.
-->

Behold, and the model did train and I checked back in the morning and saw the testing 0-1 accuracy and loss at 13.39% and 3.7093 respectively. Excited to see the toddler give me parenting advice, I threw a set of tokens "How to raise" with a 0.1 temperature and got back <unk>, raising the temperature to 0.7, gave me some mix of tokens like "the" but still the output was predominately <unk>


I realized this was just a manifestation of most tokens being <unk> and the only thing model had learned was to predict <unk>. [Insert evidence where we achieve the same loss/0-1  accuracy with just a model predicting <unk> at all times.


## What vocabulary size actually costs you

<!--
Fold in the light version of the hyperparameter tradeoffs here (topic c):
- How vocab_size, batch_size, and seq_len trade against GPU memory.
- The sweet spot you landed on (real numbers).
- Frame it as "what I understand now," earned through the failure — that's the difference from a tutorial.
-->





## Takeaways

<!--
3-5 crisp bullets a reader can walk away with. Examples:
- Inspect model OUTPUTS, not just the loss curve.
- Make <unk> an explicit, distinct token — never let it silently alias <pad>.
- Vocab size is a memory knob AND a semantics knob; picking it is a real tradeoff.
- (optional) When to stop fighting Kaggle and rent compute / use LoRA.
-->

a) The metrics being optimized are a proxy for the model quality, one should always play with the model outputs.
For example: 0-1 accuracy and loss of 13% and 3.793 respectively on 200+ vocabulary seemed promising yet the model is useless.

b) Put your hyperparameters in a confined spot and learn about their tradeoffs, the first make the iteration on them smoother while the former makes for informed decisions.

For example: MAX_VOCAB was declared next to tokenizer, sequence_length was declared at start of dataloader, while batch_size was declared 20+ lines back. They did not have tradeoffs documented.

c) 