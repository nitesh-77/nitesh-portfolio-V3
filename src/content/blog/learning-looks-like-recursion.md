---
title: learning looks like recursion
description: How going back to the basics changed the way I learn.
published: 2025-05-12
draft: false
---

## A quick backstory

Back when I was in high school, I still remember that first year. And the years before it. I had no real interest in studying what we were learning. Naturally, I performed very badly.

Truth be told, I just didn’t like it. I didn’t see the point. Later on, during the years that actually mattered most, the final two years of high school, it caught up to me.

My idea was: “This stuff is boring and pointless. I don’t care. I’ll just focus during the last two years.” So after that first year, where I ended up among the last five students in class, I decided over the summer: Okay, let’s actually try to study.

Once I started watching online lectures, mostly in Math and Physics, the only two subjects I actually found interesting, I noticed something. The professor would use a technique or reference a concept and just assume it was common knowledge.

That’s when I came to a simple realization: **I didn’t have the prerequisites.**

So I closed that lecture and opened another one, aimed at younger students. I kept going back as far as I needed to, until I landed on a lecture where I genuinely understood everything the professor was doing. Then I built my way back up.

This was such an interesting experience. On the surface, it might look like a lazy student trying to catch up on missed concepts. But it was more than that. It made me realize something deeper.

All this “hard stuff,” all these topics that make you go “I have no fucking idea how people understand this”, they’re not unreachable. You just need the right prerequisites. Once you get them, everything clicks. The satisfaction is the same as solving a puzzle.

If you’re wondering how this actually ended, I hit the goal. Perfect scores across all three subjects that mattered to me. 24 tests. Average: 19 to 20 out of 20. =)

## A way to see learning new things

Think of learning like recursion. When you don’t understand something, you don’t brute-force your way through it. You recurse. You find the missing base case.

Let’s say you’ve built HTTP servers. That already implies a stack of knowledge: You understand request/response models. You know what a TCP handshake is. You’ve parsed headers, serialized JSON, maybe even dealt with MIME types. You’ve seen how a server binds to a port, how routing works, how a client connects over a socket. You probably have mental models of status codes, HTTP methods, maybe even idempotency and caching semantics.

This is your context. Your foundation.

So when you learn something like gRPC, you’re not starting from zero, you already understand that under the hood, it’s still riding HTTP/2, using persistent streams, leveraging headers for metadata, and serializing with Protocol Buffers instead of JSON. Your mind doesn’t freeze. It maps new abstractions onto known territory.

But try jumping into OS-level concepts like virtual memory, page faults, or syscall dispatch without the underlying knowledge, and you’ll drown. Because your stack is broken. You don’t yet understand what a process is, how context switching works, how the kernel mediates access to hardware, or how memory gets mapped to address space. So you can’t climb. You have to recurse.

You go deeper:

- → What is a syscall?
- → How does user mode transition to kernel mode?
- → What does the int 0x80 instruction do on x86?
- → How are memory pages structured?
- → What even is a page?

Etc, follow your curiosity. And never stop asking questions.

At some point, you’ll hit a point where the concepts stop being alien. That’s your base case. From there, you start building back up, one layer at a time.

This is why people say “the beginning is the hardest.” It’s not hard because the material is hard. It’s hard because you’re trying to recurse without a base case. Once you find it, the rest is just function calls on top.

## Why is this mindset useful?

Once you shift from awe to analysis, the path becomes clearer. Instead of seeing a project and thinking “I could never build that”, you start asking “What does this actually require?” And when you break it down, most of it is just a chain of knowables.

They built a compiler? That means they understand parsing, lexical analysis, maybe intermediate representations. Which implies knowledge of data structures, tree traversal, memory layout, and instruction sets. If the compiler targets a VM, they probably understand bytecode execution. If it targets native code, they know assembly and how the CPU works.

What looks like a towering skillset is really a deep chain of connected nodes. And once you see that, you realize you’re not blocked by talent, you’re just blocked by unresolved dependencies.

That’s why this mindset matters. Because recursion doesn’t just explain how we learn, it explains why progress feels impossible until it isn’t. Resolve your base cases. The rest unfolds.
