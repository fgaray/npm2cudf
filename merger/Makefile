YAML = /home/felipe/Downloads/yaml-cpp
INCLUDE_POSTGRES = /usr/include/postgresql

all: merger merger_json

merger: merger.cpp
	g++ -O2  -std=c++11 merger.cpp -fopenmp -lpthread -I$(YAML)/include/ $(YAML)/build/libyaml-cpp.a -static-libstdc++ -o merger

merger_json: merger_json.cpp
	g++ -O2  -std=c++11 merger_json.cpp -fopenmp -lpthread -I$(YAML)/include/ $(YAML)/build/libyaml-cpp.a -static-libstdc++ -o merger_json

clean:
	rm -f merger_json merger
