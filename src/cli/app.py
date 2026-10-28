"""Interactive Terminal CLI for Solstice (至日) using Rich & Typer."""

from __future__ import annotations

import typer
from rich.console import Console
from rich.markdown import Markdown
from rich.panel import Panel
from rich.table import Table

from src import __version__
from src.config import settings
from src.agents.nodes import SolsticeNodes
from src.agents.workflow import build_solstice_graph, create_initial_state

app = typer.Typer(
    name="solstice",
    help="Solstice (至日) — Artistic, Industrial-Grade AI Career & Internship Multi-Agent Platform",
    add_completion=False,
)
console = Console()

BANNER = """[bold gold1]
   ✦  S O L S T I C E  ·  至 日  ✦
[/bold gold1][italic grey78]
“每一份经历，皆是未完成的旷世长卷；每一簇星宿，皆是指向天顶的引力之弦。”
[/italic grey78]"""


@app.command()
def version():
    """Display Solstice version and astrolabe crest."""
    console.print(Panel(BANNER, subtitle=f"v{__version__} · Architecture Guild", border_style="gold1"))


@app.command()
def health():
    """Inspect system settings, fine-tuned SLM status, and vector store indices."""
    console.print(BANNER)
    table = Table(title="✦ Solstice System Topology & Health Status ✦", border_style="bright_blue")
    table.add_column("Subsystem", style="cyan", no_wrap=True)
    table.add_column("Configuration / Status", style="green")

    table.add_row("Version", f"v{__version__}")
    table.add_row("Model Mode", "Fine-Tuned SLM (Local vLLM)" if settings.use_finetuned_slm else f"Frontier API ({settings.frontier_model})")
    table.add_row("Neo4j Endpoint", settings.neo4j_uri)
    table.add_row("Vector Store Docs", "5 Seed Exemplars, Traps & JDs")
    table.add_row("Circuit Breaker Max Retries", str(settings.max_guardrail_retries))
    table.add_row("DPO Flywheel Log", settings.guardrail_flywheel_path)

    console.print(table)


@app.command()
def chat(
    message: str = typer.Option(None, "--message", "-m", help="Single message to execute"),
    resume: str = typer.Option(None, "--resume", "-r", help="Raw resume text or path"),
    persona: str = typer.Option("rigorous_tech_lead", "--persona", "-p", help="Interviewer persona"),
):
    """Run an interactive conversation or single-shot execution with Solstice."""
    console.print(Panel(BANNER, border_style="gold1"))
    nodes = SolsticeNodes()
    graph = build_solstice_graph(nodes)

    if message:
        with console.status("[bold gold1]至日正在推演多智能体图谱状态机...[/bold gold1]"):
            state = create_initial_state(
                user_message=message,
                raw_resume_text=resume,
                interviewer_persona=persona,
            )
            out_state = graph.invoke(state)

        console.print(Markdown(out_state["final_response"]))
        return

    # Interactive REPL Loop
    console.print("[dim grey78]输入你的经历描述、求职诉求或面试回答（输入 exit 退出）：[/dim grey78]\n")
    session_id = None
    user_graph = None

    while True:
        try:
            user_input = console.input("[bold gold1]Solstice ❯ [/bold gold1]")
            if not user_input.strip():
                continue
            if user_input.strip().lower() in ("exit", "quit", "q"):
                console.print("[italic gold1]愿至日之光，普照君之长卷。再会。[/italic gold1]")
                break

            with console.status("[bold cyan]推演星图与雕刻长卷中...[/bold cyan]"):
                state = create_initial_state(
                    user_message=user_input,
                    session_id=session_id,
                    raw_resume_text=resume,
                    interviewer_persona=persona,
                    user_profile_graph=user_graph,
                )
                out_state = graph.invoke(state)
                session_id = out_state["session_id"]
                user_graph = out_state.get("user_profile_graph")

            console.print("\n")
            console.print(Markdown(out_state["final_response"]))
            console.print("\n" + "─" * 60 + "\n")

        except (KeyboardInterrupt, EOFError):
            console.print("\n[italic gold1]至日会话已优雅结束。[/italic gold1]")
            break


@app.command()
def carve(
    experience: str = typer.Argument(..., help="Raw experience fragment to carve into STAR-L"),
):
    """Directly carve raw experience into high-density STAR-L bullets with zero fabrication."""
    console.print(Panel(f"[bold cyan]工笔自画像 · STAR-L 经历雕琢[/bold cyan]\n原始输入: {experience}", border_style="cyan"))
    nodes = SolsticeNodes()
    graph = build_solstice_graph(nodes)

    with console.status("[bold cyan]正在雕琢 STAR-L 经历并执行双层 Anti-AI 审查...[/bold cyan]"):
        state = create_initial_state(
            user_message=experience,
            raw_resume_text=experience,
            current_phase="SELF_PORTRAIT",
        )
        out_state = graph.invoke(state)

    console.print(Markdown(out_state["final_response"]))


@app.command()
def constellation(
    resume: str = typer.Argument(..., help="Candidate resume or project summary"),
):
    """Run Constellation 2-hop topological matching and discover transferable cognitive bridges."""
    console.print(Panel("[bold magenta]天穹星宿 · 2-Hop 拓扑对齐与认知跃迁[/bold magenta]", border_style="magenta"))
    nodes = SolsticeNodes()
    graph = build_solstice_graph(nodes)

    with console.status("[bold magenta]正在遍历 Neo4j 2-Hop 路径与 Hybrid RRF 匹配...[/bold magenta]"):
        state = create_initial_state(
            user_message="对齐目标岗位并寻找 2-Hop 跃迁路径",
            raw_resume_text=resume,
            current_phase="CONSTELLATION",
        )
        out_state = graph.invoke(state)

    console.print(Markdown(out_state["final_response"]))


@app.command()
def rehearse(
    answer: str = typer.Argument(..., help="Your answer to mock interview probe"),
    depth: int = typer.Option(1, "--depth", "-d", help="Probe depth: 1=Implementation, 2=Trade-offs, 3=Recovery"),
    persona: str = typer.Option("rigorous_tech_lead", "--persona", "-p", help="Interviewer persona"),
):
    """Pressure-test engineering depth across 3 layers in The Rehearsal stage."""
    console.print(Panel(f"[bold red]声相排练场 · 深度追问舞台 (Depth {depth})[/bold red]", border_style="red"))
    nodes = SolsticeNodes()
    graph = build_solstice_graph(nodes)

    with console.status("[bold red]技术主考官正在推演架构盲区与反例...[/bold red]"):
        state = create_initial_state(
            user_message=answer,
            current_phase="THE_REHEARSAL",
            interviewer_persona=persona,
            probe_depth=depth,
        )
        out_state = graph.invoke(state)

    console.print(Markdown(out_state["final_response"]))


if __name__ == "__main__":
    app()
