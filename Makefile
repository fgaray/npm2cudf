SRC = npm2cudf.ml
PACKAGES = yojson,netclient,dose3.npm,dose3,re.str


all:
	ocamlfind ocamlopt -inline 1000 -package $(PACKAGES) -o npm2cudf -linkpkg $(SRC)
