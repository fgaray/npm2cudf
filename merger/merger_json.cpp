// Compile With
// You need:  https://github.com/jbeder/yaml-cpp
// g++ -O2  -std=c++11 merger.cpp -fopenmp -lpthread -I/home/felipe/Downloads/yaml-cpp/include/ /home/felipe/Downloads/yaml-cpp/build/libyaml-cpp.a -static-libstdc++
#include <iostream>
#include <unordered_map>
#include <string>
#include <pthread.h>
#include <string.h>
#include <fstream>
#include <sstream>
#include <yaml-cpp/yaml.h>
#include <vector>
#include <tuple>
using namespace std;
using namespace YAML;

typedef unordered_map<string, string> stringmap;

size_t broken = 0, total = 0;


void insert_element(stringmap &map, const Node &node, pthread_rwlock_t *lock, ofstream &fout, string date){
  bool to_write = false;
  string key;

  try{
    string name = node["package"].as<string>();
    string version = node["version"].as<string>();
    key = name + version;
  }catch(...){
    return;
  }

  pthread_rwlock_rdlock(lock);
    if(map.find(key) == map.end()){
      to_write = true;
    }
  pthread_rwlock_unlock(lock);


  if(to_write){
    string name = node["package"].as<string>();
    string version = node["version"].as<string>();
    string number = node["number"].as<string>();
    string key = name + version;
    string status = node["status"].as<string>();

    string set;

    if(status == "ok"){

      ostringstream out_set;
      out_set << "[";

      auto install =  node["installationset"];

      for(size_t i = 0; i < install.size(); i++){
        out_set << "{";
        out_set << "\"" << install[i]["package"] << "\"" << ":" << "\"" << install[i]["version"] << "\"";
        out_set << "}";

        if(i + 1 != install.size()){
          out_set << ",";
        }
      }

      out_set << "]";

      set = out_set.str();
    }else{

      ostringstream out_set;
      auto reasons = node["reasons"];
      out_set << "[";

      for(size_t i = 0; i < reasons.size(); i++){
        out_set << "{";

        auto missing = reasons[i]["missing"];
        auto pkg = missing["pkg"];
          //YAML::Emitter out;
          //out << node["reasons"];
          //cout << out.c_str() << endl;
          //exit(-1);
        //}
        auto depchains = missing["depchains"];

        string unsat = pkg["unsat-dependency"].as<string>();
        string version_unsat = pkg["version"].as<string>();

        out_set << "\"unsat\": \"" << unsat << "\", ";
        out_set << "\"version\": \"" << version_unsat << "\"";
        out_set << "}";

        if(i + 1 != reasons.size()){
          out_set << ",";
        }
      }
      out_set << "]";
      set = out_set.str();
    }



//- reasons:
    //- missing:
        //pkg:
          //unsat-dependency: system.collections.generic (>= 1)
          //version: 2
          //package: windows.applicationmodel.datatransfer
        //depchains:
          //- depchain:
              //- version: 1
                //depends: windows.graphics.printing (>= 1)
                //package: windows.graphics.printing.optiondetails
              //- depends: windows.applicationmodel.datatransfer (>= 1)
                //version: 2
                //package: windows.graphics.printing

  //reasons:
    //- missing:
        //pkg:
          //version: 18
          //unsat-dependency: node-authorizenet (>= 1)
          //package: 42-cent




    string str_status;
    
    if(status == "ok"){
      str_status = "true";
    }else{
      str_status = "false";
    }

    ostringstream out;
    out << "{\"name\": " << "\"" << name << "\"";
    out << ", \"version\": " << "\"" << version << "\"";
    out << ", \"number\": " << "\"" << number << "\"";
    out << ", \"status\": " << "\"" << str_status << "\"";
    out << ", \"date\": " << "{ $date: \"" << date << "T00:00:00Z" << "\"}";
    out << ", \"set\": " << set << "}";


    pthread_rwlock_wrlock(lock);

    fout << out.str() << endl;

    if(status != "ok"){
      broken++;
    }

    total++;
    map.insert(make_pair(key, ""));

    pthread_rwlock_unlock(lock);
  }
}


int main(int argc, char *argv[])
{

  if(argc < 2){
    cerr << "You need to give a json date to add to the results like: YYYY-MM-DD" << endl;
    return -1;
  }

  string date = argv[1];

  stringmap map;

  ofstream fout;

  fout.open("merged.csv");


  pthread_rwlock_t lock;
  pthread_rwlock_init(&lock, NULL);

  #pragma omp parallel for shared(lock, map, fout) num_threads(4)
  for(size_t i = 0; i <= 17; i++){
    char buffer[50];
    sprintf(buffer, "output-%d-clean.yml", i);
    cout << "File: " << buffer << endl;
    ifstream file(buffer);

    string line;
    string item = "";

    while(getline(file, line)){
      if(line[1] == '-'){
        auto node = YAML::Load(item);
        insert_element(map, node, &lock, fout, date);
        item = "";
      }else{
        item = item + "\n" + line;
      }
    }
    auto node = YAML::Load(item);
    insert_element(map, node, &lock, fout, date);
  }


  pthread_rwlock_destroy(&lock);

  cout << "Broken: " << broken << endl;
  cout << "Total: " << total << endl;

  fout.close();

  return 0;
}
